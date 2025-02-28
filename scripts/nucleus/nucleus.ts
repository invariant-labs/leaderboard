import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import {
  parsePosition,
  PoolStructure,
  Position,
  RawPosition,
} from "@invariant-labs/sdk-eclipse/lib/market";
import {
  calculatePriceSqrt,
  getDeltaX,
  getDeltaY,
} from "@invariant-labs/sdk-eclipse/lib/math";
import { PublicKey, Connection } from "@solana/web3.js";
import fs from "fs";

require("dotenv").config();

const TETH_DECIMALS = 9;
const TETH_DENOMINATOR = 10 ** TETH_DECIMALS;
const MAX_RETRIES = 25;
const RETRY_DELAY = 2000;

const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
const connection = provider.connection;

const POOLS: PublicKey[] = [
  new PublicKey("FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9"),
  new PublicKey("D323jpT4XmBFPshHvMRsf5nHmAMLa78q8ZBX7XXonYQq"),
];
const TETH_PUBKEY = new PublicKey(
  "GU7NS9xCwgNPiAdJ69iusFrRfawjDDPjeMBovhV1d4kn"
);

const ADDRESSES: PublicKey[] = [];

interface ResultEntry {
  address: string;
  effective_balance: number;
  vault_token_address: string;
}

const main = async () => {
  const market = Market.build(
    Network.MAIN,
    provider.wallet as IWallet,
    connection
  );

  const userEntries: Record<
    string,
    Record<string, Omit<ResultEntry, "address">>
  > = {};

  for (const pool of POOLS) {
    const poolKey = pool.toBase58();
    if (!userEntries[poolKey]) {
      userEntries[poolKey] = {};
    }

    const { poolState, allPositions } = await retryOperation(
      queryStates(connection, market, pool)
    );

    const isTokenX = poolState.tokenX.equals(TETH_PUBKEY);

    for (const position of allPositions) {
      if (
        position.lowerTickIndex > poolState.currentTickIndex &&
        position.upperTickIndex <= poolState.currentTickIndex
      ) {
        continue;
      }

      const tETH = isTokenX
        ? getDeltaX(
            poolState.sqrtPrice,
            calculatePriceSqrt(position.upperTickIndex),
            position.liquidity,
            false
          ) ?? new BN(0)
        : getDeltaY(
            calculatePriceSqrt(position.lowerTickIndex),
            poolState.sqrtPrice,
            position.liquidity,
            true
          ) ?? new BN(0);

      const ownerKey = position.owner.toBase58();

      if (userEntries[poolKey][ownerKey]) {
        userEntries[poolKey][ownerKey].effective_balance +=
          tETH.toNumber() / TETH_DENOMINATOR;
      } else {
        userEntries[poolKey][ownerKey] = {
          effective_balance: tETH.toNumber() / TETH_DENOMINATOR,
          vault_token_address: isTokenX
            ? poolState.tokenXReserve.toBase58()
            : poolState.tokenYReserve.toBase58(),
        };
      }
    }
  }

  const data: ResultEntry[] = [];

  for (const values of Object.values(userEntries)) {
    for (const [key, value] of Object.entries(values)) {
      data.push({ ...value, address: key });
    }
  }

  fs.writeFileSync(
    `./scripts/nucleus/data/${new Date().getTime()}.json`,
    JSON.stringify(data, null, 2)
  );
};

const queryStates = async (
  connection: Connection,
  market: Market,
  pool: PublicKey
): Promise<{ allPositions: Position[]; poolState: PoolStructure }> => {
  const lastSignature = await getLatestTxHash(
    market.program.programId,
    connection
  );

  const poolState = await market.getPoolByAddress(pool);

  let allPositions: any[] = [];

  if (ADDRESSES.length !== 0) {
    const promises = ADDRESSES.map((a: PublicKey) =>
      market.program.account.position.all([
        { memcmp: { bytes: bs58.encode(a.toBuffer()), offset: 8 } },
      ])
    );
    allPositions = (await Promise.all(promises)).flat();
  } else {
    allPositions = await market.program.account.position.all([
      {
        memcmp: { bytes: bs58.encode(pool.toBuffer()), offset: 40 },
      },
    ]);
  }

  const recentSig = await getLatestTxHash(market.program.programId, connection);

  if (lastSignature !== recentSig) {
    throw new Error("State inconsistency, please try again");
  }

  return {
    allPositions: allPositions.map((p) => parsePosition(p.account)),
    poolState,
  };
};

// utils
export const retryOperation = async (fn: Promise<any>, retires: number = 0) => {
  try {
    return await fn;
  } catch (error) {
    if (retires < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return retryOperation(fn, retires + 1);
    } else {
      throw new Error("Failed to retry operation" + error);
    }
  }
};

export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getLatestTxHash = async (
  programId: PublicKey,
  connection: Connection
) => {
  const [signature] = await connection.getSignaturesForAddress(
    programId,
    { limit: 1 },
    "confirmed"
  );
  return signature.signature;
};

main();
