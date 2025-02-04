import {
  clog,
  fetchAllSignatures,
  fetchPoolsWithTicks,
  fetchTransactionLogs,
  processNewClosed,
  processNewOpen,
  processNewOpenClosed,
  processStillOpen,
  retryOperation,
} from "./utils";
import BN from "bn.js";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  InvariantEventNames,
  Market,
  parseEvent,
} from "@invariant-labs/sdk-eclipse";

import {
  DAY,
  FULL_SNAP_START_TX_HASH_MAINNET,
  MAX_SIGNATURES_PER_CALL,
  PROMOTED_POOLS_MAINNET,
} from "./consts";
import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { IActive, IPoolAndTicks } from "./types";
import { EventsCollection } from "../database/lp-events";
import { getTimestampInSeconds } from "./math";
import { HistoricalPointsCollection } from "../database/historical-points";
import { LpPointsCollection } from "../database/lp-points";

export const processLiquidityPoints = async (
  connection: Connection,
  market: Market,
  poolsHashes: Record<string, string>
): Promise<Record<string, string>> => {
  clog("Handling liquidity points");

  const eventsCollection = new EventsCollection();
  const historicalPointsCollection = new HistoricalPointsCollection();
  const lpPointsCollection = new LpPointsCollection();

  const sigs = (
    await Promise.all(
      PROMOTED_POOLS_MAINNET.map(({ address }) => {
        const refAddr = market.getEventOptAccount(address).address;
        const previousTxHash =
          poolsHashes[address.toString()] ?? FULL_SNAP_START_TX_HASH_MAINNET;
        return retryOperation(
          fetchAllSignatures(connection, refAddr, previousTxHash)
        ).then((signatures) => {
          if (signatures.length > 0) {
            poolsHashes[address.toString()] = signatures[0];
          } else {
            poolsHashes[address.toString()] = previousTxHash;
          }
          return signatures;
        });
      })
    )
  ).flat();

  const txLogs = await retryOperation(
    fetchTransactionLogs(connection, sigs, MAX_SIGNATURES_PER_CALL)
  );

  const finalLogs = txLogs.flat();

  const eventLogs: string[] = [];

  finalLogs.map((log: string, index: number) => {
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

  const newOpen: CreatePositionEvent[] = [];
  const newClosed: [IActive, RemovePositionEvent][] = [];
  const newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][] = [];
  const stillOpen: IActive[] = [];

  for (const curr of decodedEvents) {
    if (curr.name === InvariantEventNames.CreatePositionEvent) {
      const event = parseEvent(curr) as CreatePositionEvent;
      const owner = event.owner.toString();
      const eventsObject = await eventsCollection.getUserEvents(owner);
      if (!eventsObject) {
        continue;
      }

      if (
        eventsObject.active.some(
          (entry) =>
            entry.event.pool.toString() === event.pool.toString() &&
            new BN(entry.event.id, "hex").eq(event.id)
        )
      ) {
        continue;
      }

      const correspondingItemIndex = newOpenClosed.findIndex(
        (item) =>
          item[1].id.eq(event.id) &&
          item[1].pool.toString() === event.pool.toString()
      );

      if (correspondingItemIndex >= 0) {
        const correspondingItem = newOpenClosed[correspondingItemIndex];
        newOpenClosed.splice(correspondingItemIndex, 1);
        newOpenClosed.push([event, correspondingItem[1]]);
      }
      newOpen.push(event);
    }
    if (curr.name === InvariantEventNames.RemovePositionEvent) {
      const event = parseEvent(curr) as RemovePositionEvent;
      const ownerKey = event.owner.toString();
      const ownerData = (await eventsCollection.getUserEvents(ownerKey)) || {
        owner: ownerKey,
        active: [],
        closed: [],
      };
      const correspondingItemIndex = newOpen.findIndex(
        (item) =>
          item.id.eq(event.id) && item.pool.toString() === event.pool.toString()
      );
      if (correspondingItemIndex >= 0) {
        const correspondingItem = newOpen[correspondingItemIndex];
        newOpen.splice(correspondingItemIndex, 1);
        newOpenClosed.push([correspondingItem, event]);
        continue;
      }
      const correspondingItemIndexPreviousData = ownerData.active.findIndex(
        (item) =>
          new BN(item.event.id, "hex").eq(event.id) &&
          item.event.pool.toString() === event.pool.toString()
      );

      if (correspondingItemIndexPreviousData >= 0) {
        const correspondingItem =
          ownerData.active[correspondingItemIndexPreviousData];
        newClosed.push([
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
      }
      newOpenClosed.push([null, event]);
    }
  }

  const previouslyActiveEntries = await eventsCollection.getActiveEvents();
  previouslyActiveEntries.forEach((positions) => {
    positions.active.forEach((activeEntry) => {
      const hasBeenClosed = newClosed.some(
        (newClosedEntry) =>
          newClosedEntry[0].event.id.eq(new BN(activeEntry.event.id, "hex")) &&
          newClosedEntry[0].event.pool.toString() ===
            activeEntry.event.pool.toString()
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
    });
  });

  const poolsWithTicks: IPoolAndTicks[] | null = await fetchPoolsWithTicks(
    0,
    market,
    connection,
    PROMOTED_POOLS_MAINNET
  );

  if (!poolsWithTicks)
    throw new Error(
      "Failed to fetch pools with ticks due to state inconsistency"
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

  const updatedNewClosed = processNewClosed(newClosed, poolsWithTicks);

  const updatedNewOpenClosed = processNewOpenClosed(
    newOpenClosed,
    poolsWithTicks
  );

  updatedStillOpen.forEach(
    async (entry) => await eventsCollection.addActiveEntry(entry)
  );
  updatedNewOpen.forEach(
    async (entry) => await eventsCollection.addActiveEntry(entry)
  );
  updatedNewClosed.forEach(
    async (entry) => await eventsCollection.addClosedEntry(entry)
  );
  updatedNewOpenClosed.forEach(
    async (entry) => await eventsCollection.addClosedEntry(entry)
  );

  const keys = new Set([
    ...updatedStillOpen.map((entry) => entry.event.owner),
    ...updatedNewOpen.map((entry) => entry.event.owner),
    ...updatedNewClosed.map((entry) => entry.events[1].owner),
    ...updatedNewOpenClosed.map((entry) => entry.events[1].owner),
  ]);

  const additionalKeys: string[] = (
    await lpPointsCollection.getActivePointChanges()
  ).map((e) => e.owner);

  const entryKeysToUpdate = Array.from(new Set([...keys, ...additionalKeys]));

  for (const key of entryKeysToUpdate) {
    const userEvents = await eventsCollection.getUserEvents(key.toString());
    const userPointsEntry = await lpPointsCollection.getUserPoints(
      key.toString()
    );

    const prev24HoursHistory = userPointsEntry?.points24HoursHistory;
    if (prev24HoursHistory) {
      prev24HoursHistory.forEach((item, idx) => {
        if (new BN(item.timestamp).add(DAY).lt(currentTimestamp)) {
          prev24HoursHistory.splice(idx, 1);
        }
      });
    }

    if (!userEvents) {
      continue;
    }

    const previousTotalPoints = userPointsEntry
      ? new BN(userPointsEntry.totalPoints)
      : new BN(0);

    const activePoints = userEvents.active.reduce(
      (acc, entry) => acc.add(entry.points),
      new BN(0)
    );

    const closedPoints = userEvents.closed.reduce(
      (acc, entry) => acc.add(entry.points),
      new BN(0)
    );

    const historicalClosedPoints =
      await historicalPointsCollection.getHistoricalPoints(key.toString());

    const totalPoints = activePoints
      .add(closedPoints)
      .add(
        historicalClosedPoints
          ? new BN(historicalClosedPoints.points)
          : new BN(0)
      );

    const diff = totalPoints.sub(previousTotalPoints);
    const newEntry = {
      diff,
      timestamp: currentTimestamp,
    };

    const new24History = prev24HoursHistory
      ? diff.eqn(0)
        ? prev24HoursHistory
        : [...prev24HoursHistory, newEntry]
      : [newEntry];

    await lpPointsCollection.updatePointsHistory(key.toString(), new24History);
  }

  clog("Liquidity points handled");
  return poolsHashes;
};
