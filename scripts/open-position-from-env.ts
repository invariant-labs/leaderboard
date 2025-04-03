import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import {
  CreatePosition,
  CreatePositionTransactionCache,
  PositionListCache,
} from "@invariant-labs/sdk-eclipse/lib/market";
import {
  getMaxTick,
  getMinTick,
  getTokenProgramAddress,
  signAndSend,
  toDecimal,
} from "@invariant-labs/sdk-eclipse/lib/utils";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import BN from "bn.js";
import { calculatePriceAfterSlippage } from "@invariant-labs/sdk-eclipse/lib/math";
require("dotenv").config();

const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

const POOL = new PublicKey("3aK4ibSQamqLnB2yvCYLh1DjVDqYKBLyhT8vVs5u8cdo"); // USDC/V2 0.03%
const FOUNDER = Keypair.fromSecretKey(
  bs58.decode(process.env.FOUNDER_PRIVATE_KEY as string)
);

const main = async () => {
  const market = Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );

  const poolState = await market.getPoolByAddress(POOL);
  const currentTickIndex = poolState.currentTickIndex;

  const pair = new Pair(poolState.tokenX, poolState.tokenY, {
    fee: poolState.fee,
    tickSpacing: poolState.tickSpacing,
  });

  const userAccountX = getAssociatedTokenAddressSync(
    pair.tokenX,
    FOUNDER.publicKey
  );
  const userAccountY = getAssociatedTokenAddressSync(
    pair.tokenY,
    FOUNDER.publicKey
  );

  // const lowerTick = currentTickIndex - pair.tickSpacing;
  // const upperTick = currentTickIndex + pair.tickSpacing;
  const lowerTick = -Infinity;
  const upperTick = Infinity;
  const params: CreatePosition = {
    knownPrice: poolState.sqrtPrice,
    liquidityDelta: new BN(100000000000),
    lowerTick,
    upperTick,
    pair,
    owner: FOUNDER.publicKey,
    slippage: toDecimal(1, 2),
    userTokenX: userAccountX,
    userTokenY: userAccountY,
  };
  const initPositionTx = await initPosition(market, params, FOUNDER);

  await signAndSend(initPositionTx, [FOUNDER], connection);
};

const initPosition = async (
  market: Market,
  params: CreatePosition,
  payer: Keypair,
  cache: CreatePositionTransactionCache = {}
) => {
  const { pair, lowerTick: lowerIndex, upperTick: upperIndex } = params;

  const lowerTick =
    lowerIndex === -Infinity ? getMinTick(pair.tickSpacing) : lowerIndex;
  const upperTick =
    upperIndex === Infinity ? getMaxTick(pair.tickSpacing) : upperIndex;

  // undefined - tmp solution
  let positionListInstruction: TransactionInstruction | undefined;
  let positionInstruction: TransactionInstruction;
  let lowerTickInstruction: TransactionInstruction | undefined;
  let upperTickInstruction: TransactionInstruction | undefined;
  let positionList: PositionListCache;
  const tx = new Transaction();

  const pool = cache.pool ?? (await market.getPool(pair));
  cache.pool = pool;

  const checkTicks = async () => {
    let accountsToFetch: {
      lowerTick: boolean;
      upperTick: boolean;
    } = {
      lowerTick: true,
      upperTick: true,
    };
    if (cache.lowerTickExists !== undefined) {
      accountsToFetch.lowerTick = false;
      if (!cache.lowerTickExists) {
        lowerTickInstruction = await market.createTickIx(
          { pair, index: lowerTick, payer: payer.publicKey },
          cache
        );
      }
    }

    if (cache.upperTickExists !== undefined) {
      accountsToFetch.upperTick = false;
      if (!cache.upperTickExists) {
        upperTickInstruction = await market.createTickIx(
          { pair, index: upperTick, payer: payer.publicKey },
          cache
        );
      }
    }

    const accounts: PublicKey[] = [];
    let indexes: {
      low: number | undefined;
      up: number | undefined;
    } = {
      low: undefined,
      up: undefined,
    };
    if (accountsToFetch.lowerTick) {
      const { tickAddress: lowerTickAddress } = market.getTickAddress(
        pair,
        lowerTick
      );
      accounts.push(lowerTickAddress);
      indexes.low = accounts.length - 1;
    }

    if (accountsToFetch.upperTick) {
      const { tickAddress: upperTickAddress } = market.getTickAddress(
        pair,
        upperTick
      );
      accounts.push(upperTickAddress);
      indexes.up = accounts.length - 1;
    }

    const fetchedAccounts = await market.program.account.tick.fetchMultiple(
      accounts
    );

    if (indexes.low !== undefined && fetchedAccounts[indexes.low] === null) {
      lowerTickInstruction = await market.createTickIx(
        { pair, index: lowerTick, payer: payer.publicKey },
        cache
      );
    }
    if (indexes.up !== undefined && fetchedAccounts[indexes.up] === null) {
      upperTickInstruction = await market.createTickIx(
        { pair, index: upperTick, payer: payer.publicKey },
        cache
      );
    }
  };

  const checkPositionList = async () => {
    if (cache.positionList !== undefined) {
      positionList = cache.positionList;
      if (!cache.positionList.initialized) {
        positionListInstruction = await market.createPositionListIx(
          params.owner!,
          payer.publicKey
        );
      }
      return;
    }

    try {
      const list = await market.getPositionList(params.owner!);
      positionList = { head: list.head, initialized: true };
    } catch (e) {
      positionListInstruction = await market.createPositionListIx(
        params.owner!,
        payer.publicKey
      );
      positionList = { head: 0, initialized: false };
    }
  };

  const [tokenXProgramAddress, tokenYProgramAddress] = await Promise.all([
    TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    checkTicks(),
    checkPositionList(),
  ]);

  cache.tokenXProgramAddress = tokenXProgramAddress;
  cache.tokenYProgramAddress = tokenYProgramAddress;
  cache.positionList = positionList!;

  if (!positionList!.initialized) {
    positionListInstruction = await market.createPositionListIx(
      params.owner!,
      payer.publicKey
    );
  }

  positionInstruction = await initPositionInstruction(
    market,
    params,
    payer,
    cache
  );

  if (lowerTickInstruction) {
    tx.add(lowerTickInstruction);
  }
  if (upperTickInstruction) {
    tx.add(upperTickInstruction);
  }
  if (positionListInstruction) {
    tx.add(positionListInstruction);
  }

  return tx.add(positionInstruction);
};

const initPositionInstruction = async (
  market: Market,
  {
    pair,
    owner,
    userTokenX,
    userTokenY,
    lowerTick,
    upperTick,
    liquidityDelta,
    knownPrice,
    slippage,
  }: CreatePosition,
  payer: Keypair,
  cache: CreatePositionTransactionCache = {}
) => {
  const slippageLimitLower = calculatePriceAfterSlippage(
    knownPrice,
    slippage,
    false
  );
  const slippageLimitUpper = calculatePriceAfterSlippage(
    knownPrice,
    slippage,
    true
  );

  const upperTickIndex =
    upperTick !== Infinity ? upperTick : getMaxTick(pair.tickSpacing);
  const lowerTickIndex =
    lowerTick !== -Infinity ? lowerTick : getMinTick(pair.tickSpacing);

  // maybe in the future index cloud be store at market
  const { tickAddress: lowerTickAddress } = market.getTickAddress(
    pair,
    lowerTickIndex
  );
  const { tickAddress: upperTickAddress } = market.getTickAddress(
    pair,
    upperTickIndex
  );
  const poolAddress = pair.getAddress(market.program.programId);
  const { positionListAddress } = market.getPositionListAddress(owner!);

  const [state, head, tokenXProgram, tokenYProgram] = await Promise.all([
    cache.pool ?? market.getPool(pair),
    cache.positionList?.head ??
      (async () => {
        try {
          return market.getPositionList(owner!).then((p) => p.head);
        } catch (e) {
          return 0;
        }
      })(),
    cache.tokenXProgramAddress ??
      getTokenProgramAddress(market.connection, pair.tokenX),
    cache.tokenYProgramAddress ??
      getTokenProgramAddress(market.connection, pair.tokenY),
  ]);

  const { positionAddress } = market.getPositionAddress(owner!, head);

  return market.program.methods
    .createPosition(
      lowerTickIndex,
      upperTickIndex,
      { v: liquidityDelta },
      { v: slippageLimitLower },
      { v: slippageLimitUpper }
    )
    .accounts({
      state: market.stateAddress.address,
      pool: poolAddress,
      positionList: positionListAddress,
      position: positionAddress,
      tickmap: state.tickmap,
      owner,
      payer: payer.publicKey,
      lowerTick: lowerTickAddress,
      upperTick: upperTickAddress,
      tokenX: pair.tokenX,
      tokenY: pair.tokenY,
      accountX: userTokenX,
      accountY: userTokenY,
      reserveX: state.tokenXReserve,
      reserveY: state.tokenYReserve,
      programAuthority: market.programAuthority.address,
      tokenXProgram,
      tokenYProgram,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
      eventOptAcc: market.getEventOptAccount(poolAddress).address,
    })
    .instruction();
};
main();
