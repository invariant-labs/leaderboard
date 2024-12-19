import {
  getMarketAddress,
  InvariantEventNames,
  IWallet,
  Market,
  Network,
  parseEvent,
} from "@invariant-labs/sdk-eclipse";
import { IActive, IConfig, IPoolAndTicks, IPositions } from "../src/types";
import * as fs from "fs";
import path from "path";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getTimestampInSeconds } from "../src/math";

import { PublicKey } from "@solana/web3.js";
import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";
import {
  FULL_SNAP_START_TX_HASH,
  MAX_SIGNATURES_PER_CALL,
  PROMOTED_POOLS_MAINNET,
} from "../src/consts";
import {
  fetchAllSignatures,
  fetchTransactionLogs,
  isPromotedPool,
  processNewClosed,
  processNewOpen,
  processNewOpenClosed,
  processStillOpen,
} from "../src/utils";

const validatePointsDistribution = async () => {
  const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
  const connection = provider.connection;
  const programId = new PublicKey(getMarketAddress(Network.MAIN));

  const market = Market.build(
    Network.MAIN,
    provider.wallet as IWallet,
    connection,
    programId
  );

  const refAddress = market.getEventOptAccount(
    PROMOTED_POOLS_MAINNET[0]
  ).address;

  const sigsFullSnap = await fetchAllSignatures(
    connection,
    refAddress,
    FULL_SNAP_START_TX_HASH
  );
  const txLogsFullSnap = await fetchTransactionLogs(
    connection,
    sigsFullSnap,
    MAX_SIGNATURES_PER_CALL
  );

  const finalLogsFullSnap = txLogsFullSnap.flat();
  const eventsObjectFullSnap: Record<string, IPositions> = {};

  const eventLogsFullSnap: string[] = [];

  finalLogsFullSnap.map((log, index) => {
    if (
      log.startsWith("Program data:") &&
      finalLogsFullSnap[index + 1].startsWith(
        `Program ${market.program.programId.toBase58()}`
      )
    )
      eventLogsFullSnap.push(log.split("Program data: ")[1]);
  });

  const decodedEventsFullSnap = eventLogsFullSnap
    .map((log) => market.eventDecoder.decode(log))
    .filter((decodedEvent) => !!decodedEvent);

  const { newOpen: newOpenFullSnap, newOpenClosed: newOpenClosedFullSnap } =
    decodedEventsFullSnap.reduce<{
      newOpen: CreatePositionEvent[];
      newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][];
    }>(
      (acc, curr) => {
        if (curr.name === InvariantEventNames.CreatePositionEvent) {
          const event = parseEvent(curr) as CreatePositionEvent;
          if (!isPromotedPool(PROMOTED_POOLS_MAINNET, event.pool)) return acc;
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
          if (!isPromotedPool(PROMOTED_POOLS_MAINNET, event.pool)) return acc;
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

  const previousConfig: IConfig = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/previous_config_mainnet.json"),
      "utf-8"
    )
  );

  const { lastTxHash } = previousConfig;
  const sigs = await fetchAllSignatures(connection, refAddress, lastTxHash);
  const txLogs = await fetchTransactionLogs(
    connection,
    sigs,
    MAX_SIGNATURES_PER_CALL
  );

  const finalLogs = txLogs.flat();
  const eventsObject: Record<string, IPositions> = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/events_snap_mainnet.json"),
      "utf-8"
    )
  );

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

  const { newOpen, newClosed, newOpenClosed } = decodedEvents.reduce<{
    newOpen: CreatePositionEvent[];
    newClosed: [IActive, RemovePositionEvent][];
    newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][];
  }>(
    (acc, curr) => {
      if (curr.name === InvariantEventNames.CreatePositionEvent) {
        const event = parseEvent(curr) as CreatePositionEvent;
        if (!isPromotedPool(PROMOTED_POOLS_MAINNET, event.pool)) return acc;
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
        if (!isPromotedPool(PROMOTED_POOLS_MAINNET, event.pool)) return acc;
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
          (item) => new BN(item.event.id, "hex").eq(event.id)
        );

        if (correspondingItemIndexPreviousData >= 0) {
          const correspondingItem =
            ownerData.active[correspondingItemIndexPreviousData];
          acc.newClosed.push([
            {
              event: {
                ...correspondingItem.event,
                id: new BN(correspondingItem.event.id, "hex"),
                owner: new PublicKey(correspondingItem.event.owner),
                pool: new PublicKey(correspondingItem.event.pool),
                liquidity: new BN(correspondingItem.event.liquidity, "hex"),
                currentTimestamp: new BN(
                  correspondingItem.event.currentTimestamp,
                  "hex"
                ),
                secondsPerLiquidityInsideInitial: new BN(
                  correspondingItem.event.secondsPerLiquidityInsideInitial,
                  "hex"
                ),
              },
              points: new BN(correspondingItem.points, "hex"),
            },
            event,
          ]);
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
      const hasBeenClosed = newClosed.some((newClosedEntry) =>
        newClosedEntry[0].event.id.eq(new BN(activeEntry.event.id, "hex"))
      );
      if (!hasBeenClosed) {
        stillOpen.push({
          event: {
            ...activeEntry.event,
            id: new BN(activeEntry.event.id, "hex"),
            owner: new PublicKey(activeEntry.event.owner),
            pool: new PublicKey(activeEntry.event.pool),
            liquidity: new BN(activeEntry.event.liquidity, "hex"),
            currentTimestamp: new BN(activeEntry.event.currentTimestamp, "hex"),
            secondsPerLiquidityInsideInitial: new BN(
              activeEntry.event.secondsPerLiquidityInsideInitial,
              "hex"
            ),
          },
          points: new BN(activeEntry.points, "hex"),
        });
      }
    })
  );

  const poolsWithTicks: IPoolAndTicks[] = await Promise.all(
    PROMOTED_POOLS_MAINNET.map(async (pool) => {
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
          ...newOpenFullSnap.flatMap((entry) =>
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

  const updatedStillOpen = processStillOpen(
    stillOpen,
    poolsWithTicks,
    currentTimestamp
  );

  const updatedNewOpen = processNewOpen(
    newOpen,
    poolsWithTicks,
    currentTimestamp
  );

  const updatedNewClosed = processNewClosed(newClosed);

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

  const updatedNewOpenFullSnap = processNewOpen(
    newOpenFullSnap,
    poolsWithTicks,
    currentTimestamp
  );

  const updatedNewOpenClosedFullSnap = processNewOpenClosed(
    newOpenClosedFullSnap
  );

  updatedNewOpenFullSnap.forEach((entry) => {
    const ownerKey = entry.event.owner.toString();
    if (!eventsObjectFullSnap[ownerKey]) {
      eventsObjectFullSnap[ownerKey] = { active: [], closed: [] };
    }
    eventsObjectFullSnap[ownerKey].active.push(entry);
  });
  updatedNewOpenClosedFullSnap.forEach((entry) => {
    const ownerKey = entry.events[1].owner.toString();
    if (!eventsObjectFullSnap[ownerKey]) {
      eventsObjectFullSnap[ownerKey] = { active: [], closed: [] };
    }
    eventsObjectFullSnap[ownerKey].closed.push(entry);
  });

  const pointsFromSnapshot: BN = Object.keys(eventsObject).reduce(
    (acc, curr) => {
      const pointsForOpen: BN[] = eventsObject[curr].active.map(
        (entry) => entry.points
      );
      const pointsForClosed: BN[] = eventsObject[curr].closed.map(
        (entry) => entry.points
      );

      const totalPoints = pointsForOpen
        .concat(pointsForClosed)
        .reduce((sum, point) => sum.add(new BN(point, "hex")), new BN(0));

      return acc.add(totalPoints);
    },
    new BN(0)
  );

  const pointsFromFullSnapshot: BN = Object.keys(eventsObjectFullSnap).reduce(
    (acc, curr) => {
      const pointsForOpen: BN[] = eventsObjectFullSnap[curr].active.map(
        (entry) => entry.points
      );
      const pointsForClosed: BN[] = eventsObjectFullSnap[curr].closed.map(
        (entry) => entry.points
      );

      const totalPoints = pointsForOpen
        .concat(pointsForClosed)
        .reduce((sum, point) => sum.add(point), new BN(0));

      return acc.add(totalPoints);
    },
    new BN(0)
  );

  const pointsDiff = pointsFromFullSnapshot.sub(pointsFromSnapshot);
  const percentageDiff = pointsDiff.muln(100).div(pointsFromFullSnapshot);

  console.log(
    "Distributed: ",
    pointsFromSnapshot.muln(100).div(pointsFromFullSnapshot).toNumber(),
    "%",
    `${pointsFromSnapshot.toNumber()} / ${pointsFromFullSnapshot.toNumber()}`
  );
  console.log(
    `Loss: ${percentageDiff.toNumber()} % (${pointsDiff} / ${pointsFromFullSnapshot})`
  );
  console.log("Actual points distributed:", pointsFromSnapshot.toNumber());
};

validatePointsDistribution();
