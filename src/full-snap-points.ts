import {
  Network,
  Market,
  getMarketAddress,
  IWallet,
  InvariantEventNames,
  parseEvent,
} from "@invariant-labs/sdk-eclipse";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import {
  FULL_SNAP_START_TX_HASH,
  MAX_SIGNATURES_PER_CALL,
  PROMOTED_POOLS_TESTNET,
  PROMOTED_POOLS_MAINNET,
} from "./consts";
import {
  fetchAllSignatures,
  fetchTransactionLogs,
  isPromotedPool,
  processNewOpen,
  processNewOpenClosed,
} from "./utils";
import { IPoolAndTicks, IPositions } from "./types";
import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { getTimestampInSeconds } from "./math";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const createFullSnapshotForNetwork = async (network: Network) => {
  let provider: AnchorProvider;
  let eventsSnapFilename: string;
  let PROMOTED_POOLS: PublicKey[];

  switch (network) {
    case Network.MAIN:
      provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
      eventsSnapFilename = path.join(
        __dirname,
        "../data/events_full_snap_mainnet.json"
      );
      PROMOTED_POOLS = PROMOTED_POOLS_MAINNET;
      break;
    case Network.TEST:
      provider = AnchorProvider.local(
        "https://testnet.dev2.eclipsenetwork.xyz"
      );
      eventsSnapFilename = path.join(
        __dirname,
        "../data/events_full_snap_testnet.json"
      );
      PROMOTED_POOLS = PROMOTED_POOLS_TESTNET;
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

  const sigs = await fetchAllSignatures(
    connection,
    market.eventOptAccount.address,
    FULL_SNAP_START_TX_HASH
  );
  const txLogs = await fetchTransactionLogs(
    connection,
    sigs,
    MAX_SIGNATURES_PER_CALL
  );

  const finalLogs = txLogs.flat();
  const eventsObject: Record<string, IPositions> = {};

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

  const decodedEvents = eventLogs
    .map((log) => market.eventDecoder.decode(log))
    .filter((decodedEvent) => !!decodedEvent);

  const { newOpen, newOpenClosed } = decodedEvents.reduce<{
    newOpen: CreatePositionEvent[];
    newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][];
  }>(
    (acc, curr) => {
      if (curr.name === InvariantEventNames.CreatePositionEvent) {
        const event = parseEvent(curr) as CreatePositionEvent;
        if (!isPromotedPool(PROMOTED_POOLS, event.pool)) return acc;
        const correspondingItemIndex = acc.newOpenClosed.findIndex((item) =>
          item[1].id.eq(event.id)
        );
        if (correspondingItemIndex >= 0) {
          const correspondingItem = acc.newOpenClosed[correspondingItemIndex];
          acc.newOpenClosed.splice(correspondingItemIndex, 1);
          acc.newOpenClosed.push([event, correspondingItem[1]]);
          return acc;
        }
        acc.newOpen.push(event);
        return acc;
      } else if (curr.name === InvariantEventNames.RemovePositionEvent) {
        const event = parseEvent(curr) as RemovePositionEvent;
        if (!isPromotedPool(PROMOTED_POOLS, event.pool)) return acc;
        const correspondingItemIndex = acc.newOpen.findIndex((item) =>
          item.id.eq(event.id)
        );
        if (correspondingItemIndex >= 0) {
          const correspondingItem = acc.newOpen[correspondingItemIndex];
          acc.newOpen.splice(correspondingItemIndex, 1);
          acc.newOpenClosed.push([correspondingItem, event]);
          return acc;
        }

        acc.newOpenClosed.push([null, event]);
        return acc;
      }
      return acc;
    },
    { newOpen: [], newOpenClosed: [] }
  );

  const poolsWithTicks: IPoolAndTicks[] = await Promise.all(
    PROMOTED_POOLS.map(async (pool) => {
      const ticksUsed = Array.from(
        new Set([
          ...newOpen.flatMap((entry) =>
            entry.pool.toString() === pool.toString()
              ? [entry.lowerTick, entry.upperTick]
              : []
          ),
        ])
      );
      const [poolStructure, ticks] = await Promise.all([
        market.getPoolByAddress(pool),
        Promise.all(ticksUsed.map((tick) => market.getTickByPool(pool, tick))),
      ]);

      return { pool, poolStructure: poolStructure, ticks };
    })
  );

  const currentTimestamp = getTimestampInSeconds();

  const updatedNewOpen = processNewOpen(
    newOpen,
    poolsWithTicks,
    currentTimestamp
  );

  const updatedNewOpenClosed = processNewOpenClosed(newOpenClosed);

  updatedNewOpen.forEach((entry) => {
    const ownerKey = entry.event.owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].active.push(entry);
  });
  updatedNewOpenClosed.forEach((entry) => {
    const ownerKey = entry.events[1].owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].closed.push(entry);
  });

  fs.writeFileSync(eventsSnapFilename, JSON.stringify(eventsObject, null, 2));
};

createFullSnapshotForNetwork(Network.TEST).then(
  () => {
    console.log("Eclipse: Testnet snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);

// createFullSnapshotForNetwork(Network.MAIN).then(
//   () => {
//     console.log("Eclipse: Mainnet snapshot done!");
//   },
//   (err) => {
//     console.log(err);
//   }
// );
