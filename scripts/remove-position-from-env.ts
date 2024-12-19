import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  IWallet,
  Market,
  Network,
  Pair,
  signAndSend,
} from "@invariant-labs/sdk-eclipse";
import { RemovePosition } from "@invariant-labs/sdk-eclipse/lib/market";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";

require("dotenv").config();

const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

const POOL = new PublicKey("4xLSZJwLdkQHGqgyx1E9KHvdMnj7QVKa9Pwcnp1x2mDc"); // USDC/TTS 0.05%
const FOUNDER = Keypair.fromSecretKey(
  bs58.decode(process.env.FOUNDER_PRIVATE_KEY as string)
);

const main = async () => {
  const market = await Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );

  const poolState = await market.getPoolByAddress(POOL);

  const pair = new Pair(poolState.tokenX, poolState.tokenY, {
    fee: poolState.fee,
    tickSpacing: poolState.tickSpacing,
  });

  const founderAccountX = getAssociatedTokenAddressSync(
    pair.tokenX,
    FOUNDER.publicKey
  );
  const founderAccountY = getAssociatedTokenAddressSync(
    pair.tokenY,
    FOUNDER.publicKey
  );

  const params: RemovePosition = {
    pair,
    index: 2,
    owner: FOUNDER.publicKey,
    userTokenX: founderAccountX,
    userTokenY: founderAccountY,
    payer: FOUNDER.publicKey,
  };
  const tx = await market.removePositionTx(params);
  await signAndSend(tx, [FOUNDER], connection);
};

main();
