import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import { getEffectiveTETHBalances } from "../../sdk/src";

require("dotenv").config();

const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
const connection = provider.connection;

const ADDRESSES: PublicKey[] = [
  // new PublicKey("6Wpj1RUs1hBwKuAzfFPGeHtgiQp5Fx4PVkDwfgzkLYCu"),
];

const main = async () => {
  const data = await getEffectiveTETHBalances(connection, ADDRESSES);
  console.log(data);
  fs.writeFileSync(
    `./scripts/nucleus/data/${new Date().getTime()}.json`,
    JSON.stringify(data, null, 2)
  );
};
main();
