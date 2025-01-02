import { Keypair } from "@solana/web3.js";
import fs from "fs";
const WALLETS: number[][] = [];
const WALLET_COUNT = 50;
const main = async () => {
  for (let i = 0; i < WALLET_COUNT; i++) {
    WALLETS.push(Array.from(Keypair.generate().secretKey));
  }

  fs.writeFileSync("./scripts/wallets.json", JSON.stringify(WALLETS));
};

main();
