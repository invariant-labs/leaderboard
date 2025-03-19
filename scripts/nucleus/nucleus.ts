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

const ADDRESSES: PublicKey[] = [
  // new PublicKey("6Wpj1RUs1hBwKuAzfFPGeHtgiQp5Fx4PVkDwfgzkLYCu"),
];

const main = async () => {
  const addresses = await getReservePubkeys(connection);
  let b = 0;
  for (const address of addresses) {
    const balance = await getBalance(
      connection,
      address,
      new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb")
    );
    b += balance.toNumber() / 1e9;
  }

  const isOk = await validateEffectiveBalance(connection, b);
  assert(isOk, "Balance equation failed");

  // const data = await getEffectiveTETHBalances(connection, ADDRESSES);
  // fs.writeFileSync(
  //   `./scripts/nucleus/data/${new Date().getTime()}.json`,
  //   JSON.stringify(data, null, 2)
  // );
};
main();
