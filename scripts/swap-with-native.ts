import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import { Swap } from "@invariant-labs/sdk-eclipse/lib/market";
import {
  createNativeAtaInstructions,
  FEE_TIERS,
  signAndSend,
  toDecimal,
} from "@invariant-labs/sdk-eclipse/lib/utils";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, Keypair, Transaction } from "@solana/web3.js";
import BN from "bn.js";

require("dotenv").config();

const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

const POOL = new PublicKey("4xLSZJwLdkQHGqgyx1E9KHvdMnj7QVKa9Pwcnp1x2mDc"); // USDC/TTS 0.05%
const FOUNDER = Keypair.fromSecretKey(
  bs58.decode(process.env.FOUNDER_PRIVATE_KEY as string)
);

const ETH = new PublicKey("So11111111111111111111111111111111111111112");
const USDC = new PublicKey("5gFSyxjNsuQsZKn9g5L9Ky3cSUvJ6YXqWVuPzmSi8Trx");

const main = async () => {
  const market = await Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );

  const pair = new Pair(ETH, USDC, FEE_TIERS[FEE_TIERS.length - 1]);

  const userAccountX = getAssociatedTokenAddressSync(
    pair.tokenX,
    FOUNDER.publicKey
  );
  const wrappedEthAccount = Keypair.generate();

  const {
    createIx,
    initIx,
    unwrapIx: unwrap,
  } = createNativeAtaInstructions(
    wrappedEthAccount.publicKey,
    FOUNDER.publicKey,
    Network.TEST
  );

  const poolState = await market.getPool(pair);

  const tx = new Transaction();
  tx.add(createIx).add(initIx);
  const amount = new BN(10); // 100 USDC on 1% feeTier
  const swap: Swap = {
    pair,
    // USDC is tokenX, TTS is tokenY
    xToY: true,
    amount,
    estimatedPriceAfterSwap: poolState.sqrtPrice,
    slippage: toDecimal(5, 1),
    accountX: userAccountX,
    accountY: wrappedEthAccount.publicKey,
    byAmountIn: true,
    owner: FOUNDER.publicKey,
  };

  const swapIx = await market.swapIx(swap);

  tx.add(swapIx);
  tx.add(unwrap);

  const initialBlockhash = await connection.getLatestBlockhash();

  tx.recentBlockhash = initialBlockhash.blockhash;
  tx.feePayer = FOUNDER.publicKey;

  await signAndSend(tx, [FOUNDER, wrappedEthAccount], connection);
};

main();
