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
  const wallets = JSON.parse(
    fs.readFileSync("./scripts/wallets.json", "utf-8")
  );
  const walletKeys = wallets.map((w) =>
    Keypair.fromSecretKey(new Uint8Array(w))
  );

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

  for (const wallet of walletKeys) {
    console.log("Removing position for wallet", wallet.publicKey.toBase58());
    const userAccountX = getAssociatedTokenAddressSync(
      pair.tokenX,
      wallet.publicKey
    );
    const userAccountY = getAssociatedTokenAddressSync(
      pair.tokenY,
      wallet.publicKey
    );

    const params: RemovePosition = {
      pair,
      index: 0,
      owner: wallet.publicKey,
      userTokenX: userAccountX,
      userTokenY: userAccountY,
      payer: FOUNDER.publicKey,
    };
    const tx = await market.removePositionTx(params);
    await signAndSend(tx, [FOUNDER, wallet], connection);
  }
};

main();
