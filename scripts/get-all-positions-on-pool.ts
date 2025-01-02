import { AnchorProvider } from "@coral-xyz/anchor";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";

require("dotenv").config();

const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
// const provider = AnchorProvider.local(
//   "https://testnet.dev2.eclipsenetwork.xyz"
// );
const connection = provider.connection;

// const POOL = new PublicKey("G8Skt6kgqVL9ocYn4aYVGs3gUg8EfQrTJAkA2qt3gcs8"); // USDC/ETH 0.01%
const POOL = new PublicKey("HRgVv1pyBLXdsAddq4ubSqo8xdQWRrYbvmXqEDtectce"); // USDC/ETH 0.01%

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

  const allPositions = await market.getAllPositions();
  console.log("Total positions", allPositions.length);
  const filtered = allPositions.filter((pos) => pos.pool.equals(POOL));
  console.log(filtered);
  console.log("Total position on pool", filtered.length);
};
main();
