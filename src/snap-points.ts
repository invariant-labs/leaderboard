import {
  Network,
  Market,
  getMarketAddress,
  IWallet,
  InvariantEventNames,
  parseEvent,
} from "@invariant-labs/sdk-eclipse";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { MAX_SIGNATURES_PER_CALL } from "./consts";
import {
  fetchAllSignatures,
  fetchTransactionLogs,
  convertJson,
  processCreatePositionEvent,
  processRemovePositionEvent,
} from "./utils";
import { IPositions } from "./types";
import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";

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
  fs.writeFileSync(lastTxHashFileName, JSON.stringify(data, null, 2));
  const txLogs = await fetchTransactionLogs(
    connection,
    sigs,
    MAX_SIGNATURES_PER_CALL
  );

  const finalLogs = txLogs.flat();
  const previousData = JSON.parse(fs.readFileSync(eventsSnapFilename, "utf-8"));
  const eventsObject: Record<string, IPositions> = {
    ...convertJson(previousData),
  };
  const eventLogs: string[] = [];

  finalLogs.map((log, index) => {
    if (
      log.startsWith("Program data:") &&
      finalLogs[index + 1].startsWith(
        `Program ${market.program.programId.toBase58()}`
      )
    )
      eventLogs.push(log.split("Program data: ")[1]);
  });

  for (const log of eventLogs) {
    const decodedEvent = market.eventDecoder.decode(log);
    if (!decodedEvent) continue;

    switch (decodedEvent.name) {
      case InvariantEventNames.CreatePositionEvent: {
        const event = parseEvent(decodedEvent) as CreatePositionEvent;
        const ownerKey = event.owner.toString();
        const ownerData = eventsObject[ownerKey] || { active: [], closed: [] };
        const updatedData = await processCreatePositionEvent(
          event,
          ownerData,
          market
        );
        if (updatedData) eventsObject[ownerKey] = updatedData;

        break;
      }

      case InvariantEventNames.RemovePositionEvent: {
        const event = parseEvent(decodedEvent) as RemovePositionEvent;
        const ownerKey = event.owner.toString();
        const ownerData = eventsObject[ownerKey] || { active: [], closed: [] };
        const updatedData = processRemovePositionEvent(event, ownerData);
        if (updatedData) eventsObject[ownerKey] = updatedData;
        break;
      }
      default:
        break;
    }
  }
  fs.writeFileSync(eventsSnapFilename, JSON.stringify(eventsObject, null, 2));
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
