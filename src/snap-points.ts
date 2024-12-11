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
import { MAX_SIGNATURES_PER_CALL, PROMOTED_POOLS } from "./consts";
import {
  fetchAllSignatures,
  fetchTransactionLogs,
  convertJson,
  isPromotedPool,
  processStillOpen,
  processNewOpen,
  processNewClosed,
  processNewOpenClosed,
  validateLogs,
} from "./utils";
import { IActive, IConfig, IPoints, IPoolAndTicks, IPositions } from "./types";
import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { getTimestampInSeconds } from "./math";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const createSnapshotForNetwork = async (network: Network) => {
  let provider: AnchorProvider;
  let configFileName: string;
  let eventsSnapFilename: string;
  let pointsFileName: string;

  switch (network) {
    case Network.MAIN:
      provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
      configFileName = path.join(
        __dirname,
        "../data/previous_config_mainnet.json"
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
      configFileName = path.join(
        __dirname,
        "../data/previous_config_testnet.json"
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

  const previousConfig: IConfig = JSON.parse(
    fs.readFileSync(configFileName, "utf-8")
  );

  const { lastTxHash, lastSnapTimestamp } = previousConfig;
  const sigs = await fetchAllSignatures(
    connection,
    market.eventOptAccount.address,
    lastTxHash
  );
  const txLogs = await fetchTransactionLogs(
    connection,
    sigs,
    MAX_SIGNATURES_PER_CALL
  );

  const previousData = JSON.parse(fs.readFileSync(eventsSnapFilename, "utf-8"));
  const eventsObject: Record<string, IPositions> = {
    ...convertJson(previousData),
  };

  // const finalLogs = txLogs.flat();
  // const eventLogs: string[] = [];
  // finalLogs.map((log, index) => {
  //   if (
  //     log.startsWith("Program data:") &&
  //     finalLogs[index + 1].startsWith(
  //       `Program ${market.program.programId.toBase58()}`
  //     )
  //   )
  //     eventLogs.push(log.split("Program data: ")[1]);
  // });

  const eventLogs = validateLogs(txLogs, market.program.programId);

  const decodedEvents = eventLogs
    .map((log) => market.eventDecoder.decode(log))
    .filter((decodedEvent) => !!decodedEvent);

  const { newOpen, newClosed, newOpenClosed } = decodedEvents.reduce<{
    newOpen: CreatePositionEvent[];
    newClosed: [IActive, RemovePositionEvent][];
    newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][];
  }>(
    (acc, curr) => {
      if (curr.name === InvariantEventNames.CreatePositionEvent) {
        const event = parseEvent(curr) as CreatePositionEvent;
        if (!isPromotedPool(event.pool)) return acc;
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
        if (!isPromotedPool(event.pool)) return acc;
        const ownerKey = event.owner.toString();
        const ownerData = eventsObject[ownerKey] || {
          active: [],
          closed: [],
        };
        const correspondingItemIndex = acc.newOpen.findIndex((item) =>
          item.id.eq(event.id)
        );
        if (correspondingItemIndex >= 0) {
          const correspondingItem = acc.newOpen[correspondingItemIndex];
          acc.newOpen.splice(correspondingItemIndex, 1);
          acc.newOpenClosed.push([correspondingItem, event]);
          return acc;
        }
        const correspondingItemIndexPreviousData = ownerData.active.findIndex(
          (item) => item.event.id.eq(event.id)
        );
        if (correspondingItemIndexPreviousData >= 0) {
          const correspondingItem =
            ownerData.active[correspondingItemIndexPreviousData];
          acc.newClosed.push([correspondingItem, event]);
          return acc;
        }
        acc.newOpenClosed.push([null, event]);
        return acc;
      }
      return acc;
    },
    { newOpen: [], newClosed: [], newOpenClosed: [] }
  );

  const stillOpen: IActive[] = [];

  Object.values(eventsObject).forEach((positions) =>
    positions.active.forEach((activeEntry) => {
      const hasBeenClosed = newClosed.some(
        (newClosedEntry) => newClosedEntry[0].event.id === activeEntry.event.id
      );
      if (!hasBeenClosed) {
        stillOpen.push(activeEntry);
      }
    })
  );

  const poolsWithTicks: IPoolAndTicks[] = await Promise.all(
    PROMOTED_POOLS.map(async (pool) => {
      const ticksUsed = Array.from(
        new Set([
          ...stillOpen.flatMap((entry) =>
            entry.event.pool.toString() === pool.toString()
              ? [entry.event.lowerTick, entry.event.upperTick]
              : []
          ),
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

  const convertedLastSnapTimestamp = new BN(lastSnapTimestamp);

  const updatedStillOpen = processStillOpen(
    stillOpen,
    poolsWithTicks,
    currentTimestamp,
    convertedLastSnapTimestamp
  );

  const updatedNewOpen = processNewOpen(
    newOpen,
    poolsWithTicks,
    currentTimestamp
  );

  const updatedNewClosed = processNewClosed(
    newClosed,
    convertedLastSnapTimestamp
  );

  const updatedNewOpenClosed = processNewOpenClosed(newOpenClosed);

  Object.keys(eventsObject).forEach((key) => {
    eventsObject[key].active = [];
  });
  updatedStillOpen.forEach((entry) => {
    const ownerKey = entry.event.owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].active.push(entry);
  });
  updatedNewOpen.forEach((entry) => {
    const ownerKey = entry.event.owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].active.push(entry);
  });
  updatedNewClosed.forEach((entry) => {
    const ownerKey = entry.events[1].owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].closed.push(entry);
  });
  updatedNewOpenClosed.forEach((entry) => {
    const ownerKey = entry.events[1].owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].closed.push(entry);
  });

  const data = {
    lastTxHash: sigs[0] ?? lastTxHash,
    currentTimestamp: currentTimestamp.toNumber(),
  };

  const points: Record<string, IPoints> = Object.keys(eventsObject).reduce(
    (acc, curr) => {
      const pointsForOpen: number[] = eventsObject[curr].active.map(
        (entry) => entry.points
      );
      const pointsForClosed: number[] = eventsObject[curr].closed.map(
        (entry) => entry.points
      );
      const totalPoints = pointsForOpen
        .concat(pointsForClosed)
        .reduce((sum, point) => (sum += point), 0);
      acc[curr] = {
        totalPoints,
        positionsAmount: eventsObject[curr].active.length,
        last24HoursPoints: 0,
        rank: 0,
      };
      return acc;
    },
    {}
  );

  fs.writeFileSync(configFileName, JSON.stringify(data, null, 2));
  fs.writeFileSync(eventsSnapFilename, JSON.stringify(eventsObject, null, 2));
  fs.writeFileSync(pointsFileName, JSON.stringify(points, null, 2));
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
