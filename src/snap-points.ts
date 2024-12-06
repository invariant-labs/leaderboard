import {
  Network,
  Market,
  getMarketAddress,
  IWallet,
} from "@invariant-labs/sdk-eclipse";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { MAX_SIGNATURES_PER_CALL } from "./consts";
import {
  fetchAllSignatures,
  extractEvents,
  fetchTransactionLogs,
} from "./utils";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const createSnapshotForNetwork = async (network: Network) => {
  let provider: AnchorProvider;
  let lastTxHashFileName: string;
  let eventsSnapFilename: string;
  let pointsFileName: string;

  switch (network) {
    case Network.MAIN:
      provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
      lastTxHashFileName = path.join(
        __dirname,
        "../data/last_tx_hash_mainnet.json"
      );
      eventsSnapFilename = path.join(
        __dirname,
        "../data/events_snap_mainnet.json"
      );
      pointsFileName = path.join(__dirname, "../data/points_mainnet.json");
      break;
    case Network.TEST:
      provider = AnchorProvider.local(
        "https://testnet.dev2.eclipsenetwork.xyz"
      );
      lastTxHashFileName = path.join(
        __dirname,
        "../data/last_tx_hash_testnet.json"
      );
      eventsSnapFilename = path.join(
        __dirname,
        "../data/events_snap_testnet.json"
      );
      pointsFileName = path.join(__dirname, "../data/points_testnet.json");
      break;
    default:
      throw new Error("Unknown network");
  }

  const connection = provider.connection;
  const programId = new PublicKey(getMarketAddress(network));

  const market = Market.build(
    network,
    provider.wallet as IWallet,
    connection,
    programId
  );

  const lastTxHash: string | undefined =
    JSON.parse(fs.readFileSync(lastTxHashFileName, "utf-8")).lastTxHash ??
    undefined;

  const sigs = await fetchAllSignatures(
    connection,
    market.eventOptAccount.address,
    lastTxHash
  );
  if (sigs.length === 0) return;
  const data = { lastTxHash: sigs[0] };

  // fs.writeFileSync(lastTxHashFileName, JSON.stringify(data, null, 2));

  const txLogs = await fetchTransactionLogs(
    connection,
    sigs,
    MAX_SIGNATURES_PER_CALL
  );

  const finalLogs = txLogs.flat();
  const initialEvents = JSON.parse(
    fs.readFileSync(eventsSnapFilename, "utf-8")
  );

  const events = extractEvents(initialEvents, market, finalLogs);

  fs.writeFileSync(eventsSnapFilename, JSON.stringify(events, null, 2));
};

createSnapshotForNetwork(Network.TEST).then(
  () => {
    console.log("Eclipse: Testnet snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);

// createSnapshotForNetwork(Network.MAIN).then(
//   () => {
//     console.log("Eclipse: Mainnet snapshot done!");
//   },
//   (err) => {
//     console.log(err);
//   }
// );
