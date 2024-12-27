import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { MAX_RETIRES, RETRY_DELAY } from "./consts";
import { BN } from "@coral-xyz/anchor";
import { IActive, IClosed, IPoolAndTicks } from "./types";
import {
  calculatePointsToDistribute,
  calculateReward,
  calculateSecondsPerLiquidityGlobal,
  calculateSecondsPerLiquidityInside,
} from "./math";
import {
  CreatePositionEvent,
  RemovePositionEvent,
} from "@invariant-labs/sdk-eclipse/lib/market";

export const retryOperation = async (fn: Promise<any>, retires: number = 0) => {
  try {
    return await fn;
  } catch (error) {
    if (retires < MAX_RETIRES) {
      await delay(RETRY_DELAY);
      return retryOperation(fn, retires + 1);
    } else {
      throw new Error("Failed to retry operation");
    }
  }
};

export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const fetchAllSignatures = async (
  connection: Connection,
  programId: PublicKey,
  lastTxHash: string | undefined
) => {
  const allSignatures: ConfirmedSignatureInfo[] = [];
  let beforeTxHash: string | undefined = undefined;
  let done: boolean = false;

  while (!done) {
    const signatures = await connection.getSignaturesForAddress(
      programId,
      { before: beforeTxHash, until: lastTxHash },
      "confirmed"
    );

    if (signatures.length === 0) {
      done = true;
      break;
    }

    allSignatures.push(...signatures);
    if (lastTxHash === undefined) {
      done = true;
      break;
    }
    if (signatures[signatures.length - 1].signature === lastTxHash) {
      done = true;
    } else {
      beforeTxHash = signatures[signatures.length - 1].signature;
    }
  }

  return allSignatures.map((signatureInfo) => signatureInfo.signature);
};

export const processParsedTransactions = (
  parsedTransactions: (ParsedTransactionWithMeta | null)[]
) => {
  return parsedTransactions
    .filter((tx) => tx?.meta?.logMessages && tx.transaction.signatures[0])
    .map((tx) => {
      return tx!.meta!.logMessages!;
    });
};

export const fetchTransactionLogs = async (
  connection: Connection,
  signatures: string[],
  batchSize: number
) => {
  const batchCount = Math.ceil(signatures.length / batchSize);
  const batchedSignatures = new Array(batchCount).fill(0);

  return (
    await Promise.all(
      batchedSignatures.map(async (_, idx) => {
        const batchSignatures = signatures.slice(
          idx * batchSize,
          (idx + 1) * batchSize
        );
        return processParsedTransactions(
          await retryOperation(
            connection.getParsedTransactions(batchSignatures, "confirmed")
          )
        );
      })
    )
  ).flat();
};

export const processStillOpen = (
  stillOpen: IActive[],
  poolsWithTicks: IPoolAndTicks[],
  currentTimestamp: BN
) => {
  const updatedStillOpen: IActive[] = [];

  stillOpen.forEach((entry) => {
    const desiredPoolWithTicks = poolsWithTicks.find(
      (poolWithTicks) =>
        poolWithTicks.pool.toString() === entry.event.pool.toString()
    )!;
    const upperTick = desiredPoolWithTicks.ticks.find(
      (tick) => tick.index === entry.event.upperTick
    )!;
    const lowerTick = desiredPoolWithTicks.ticks.find(
      (tick) => tick.index === entry.event.lowerTick
    )!;
    const pointsPerSecond = desiredPoolWithTicks.pointsPerSecond;
    const poolStructure = desiredPoolWithTicks.poolStructure;
    const secondsPerLiquidityInside = calculateSecondsPerLiquidityInside(
      upperTick.index,
      lowerTick.index,
      poolStructure.currentTickIndex,
      upperTick.secondsPerLiquidityOutside,
      lowerTick.secondsPerLiquidityOutside,
      calculateSecondsPerLiquidityGlobal(
        poolStructure.secondsPerLiquidityGlobal,
        poolStructure.liquidity,
        poolStructure.lastTimestamp,
        currentTimestamp
      )
    );

    updatedStillOpen.push({
      event: entry.event,
      points: calculateReward(
        entry.event.liquidity,
        entry.event.secondsPerLiquidityInsideInitial,
        secondsPerLiquidityInside,
        calculatePointsToDistribute(
          entry.event.currentTimestamp,
          currentTimestamp,
          pointsPerSecond
        ),
        currentTimestamp.sub(entry.event.currentTimestamp)
      ),
    });
  });

  return updatedStillOpen;
};

export const processNewOpen = (
  newOpen: CreatePositionEvent[],
  poolsWithTicks: IPoolAndTicks[],
  currentTimestamp: BN
) => {
  const updatedNewOpen: IActive[] = [];

  newOpen.forEach((entry) => {
    const desiredPoolWithTicks = poolsWithTicks.find(
      (poolWithTicks) => poolWithTicks.pool.toString() === entry.pool.toString()
    )!;
    const upperTick = desiredPoolWithTicks.ticks.find(
      (tick) => tick.index === entry.upperTick
    )!;
    const lowerTick = desiredPoolWithTicks.ticks.find(
      (tick) => tick.index === entry.lowerTick
    )!;

    const poolStructure = desiredPoolWithTicks.poolStructure;
    const pointsPerSecond = desiredPoolWithTicks.pointsPerSecond;

    const secondsPerLiquidityGlobal = calculateSecondsPerLiquidityGlobal(
      poolStructure.secondsPerLiquidityGlobal,
      poolStructure.liquidity,
      poolStructure.lastTimestamp,
      currentTimestamp
    );

    const secondsPerLiquidityInside = calculateSecondsPerLiquidityInside(
      upperTick.index,
      lowerTick.index,
      poolStructure.currentTickIndex,
      upperTick.secondsPerLiquidityOutside,
      lowerTick.secondsPerLiquidityOutside,
      secondsPerLiquidityGlobal
    );
    updatedNewOpen.push({
      event: entry,
      points: calculateReward(
        entry.liquidity,
        entry.secondsPerLiquidityInsideInitial,
        secondsPerLiquidityInside,
        calculatePointsToDistribute(
          entry.currentTimestamp,
          currentTimestamp,
          pointsPerSecond
        ),
        currentTimestamp.sub(entry.currentTimestamp)
      ),
    });
  });

  return updatedNewOpen;
};

export const processNewClosed = (
  newClosed: [IActive, RemovePositionEvent][],
  poolsWithTicks: IPoolAndTicks[]
) => {
  const updatedNewClosed: IClosed[] = [];

  newClosed.forEach((entry) => {
    const desiredPoolWithTicks = poolsWithTicks.find(
      (poolWithTicks) =>
        poolWithTicks.pool.toString() === entry[0].event.pool.toString()
    )!;
    const pointsPerSecond = desiredPoolWithTicks.pointsPerSecond;

    updatedNewClosed.push({
      events: [entry[0].event, entry[1]],
      points: calculateReward(
        entry[1].liquidity,
        entry[0].event.secondsPerLiquidityInsideInitial,
        calculateSecondsPerLiquidityInside(
          entry[1].upperTick,
          entry[1].lowerTick,
          entry[1].currentTick,
          entry[1].upperTickSecondsPerLiquidityOutside,
          entry[1].lowerTickSecondsPerLiquidityOutside,
          entry[1].poolSecondsPerLiquidityGlobal
        ),
        calculatePointsToDistribute(
          entry[0].event.currentTimestamp,
          entry[1].currentTimestamp,
          pointsPerSecond
        ),
        entry[1].currentTimestamp.sub(entry[0].event.currentTimestamp)
      ),
    });
  });

  return updatedNewClosed;
};

export const processNewOpenClosed = (
  newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][],
  poolsWithTicks: IPoolAndTicks[]
) => {
  const updatedNewOpenClosed: IClosed[] = [];

  newOpenClosed.forEach((entry) => {
    const desiredPoolWithTicks = poolsWithTicks.find(
      (poolWithTicks) =>
        poolWithTicks.pool.toString() === entry[1].pool.toString()
    )!;
    const pointsPerSecond = desiredPoolWithTicks.pointsPerSecond;
    updatedNewOpenClosed.push({
      events: [entry[0], entry[1]],
      points: !entry[0]
        ? new BN(0)
        : calculateReward(
            entry[0].liquidity,
            entry[0].secondsPerLiquidityInsideInitial,
            calculateSecondsPerLiquidityInside(
              entry[1].upperTick,
              entry[1].lowerTick,
              entry[1].currentTick,
              entry[1].upperTickSecondsPerLiquidityOutside,
              entry[1].lowerTickSecondsPerLiquidityOutside,
              entry[1].poolSecondsPerLiquidityGlobal
            ),
            calculatePointsToDistribute(
              entry[0].currentTimestamp,
              entry[1].currentTimestamp,
              pointsPerSecond
            ),
            entry[1].currentTimestamp.sub(entry[0].currentTimestamp)
          ),
    });
  });

  return updatedNewOpenClosed;
};
