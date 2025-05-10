import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import { getEffectiveTETHBalances } from "../../sdk/src";
import {
  getReservePubkeys,
  validateEffectiveBalance,
} from "../../sdk/src/utils";
import { getBalance } from "@invariant-labs/sdk-eclipse/lib/utils";
import assert from "assert";

require("dotenv").config();

const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
const connection = provider.connection;
const TETH_DENOMINATOR = 1e9;

const ADDRESSES: PublicKey[] = [
  // new PublicKey("6Wpj1RUs1hBwKuAzfFPGeHtgiQp5Fx4PVkDwfgzkLYCu"),
];

const main = async () => {
  const data = await getEffectiveTETHBalances(connection, ADDRESSES);
  const totalEffectiveBalances = data.reduce(
    (acc, entry) => acc + entry.effective_balance,
    0
  );
  console.log("Total effective TETH: ", totalEffectiveBalances);
  const addresses = await getReservePubkeys(connection);
  console.log("Reserve Addresses: ", addresses);
  let total = 0;
  for (const address of addresses) {
    const balance = await getBalance(
      connection,
      address,
      new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") // TOKEN_2022_PROGRAM_ID
    );
    total += balance.toNumber() / TETH_DENOMINATOR;
  }

  const isOk = await validateEffectiveBalance(connection, total);
  assert(isOk, "Balance equation failed");

  // fs.writeFileSync(
  //   `./scripts/nucleus/data/${new Date().getTime()}.json`,
  //   JSON.stringify(data, null, 2)
  // );
};
main();
