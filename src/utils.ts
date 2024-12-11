import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";
import { PROMOTED_POOLS } from "./consts";
import { BN } from "@coral-xyz/anchor";
import { IActive, IClosed, IPoints, IPoolAndTicks, IPositions } from "./types";
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
          await connection.getParsedTransactions(batchSignatures, "confirmed")
        );
      })
    )
  ).flat();
};

export const isPromotedPool = (pool: PublicKey) =>
  PROMOTED_POOLS.some(
    (promotedPool) => promotedPool.toString() === pool.toString()
  );

export const processStillOpen = (
  stillOpen: IActive[],
  poolsWithTicks: IPoolAndTicks[],
  currentTimestamp: BN,
  lastSnapTimestamp: BN
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
      previousSnapSecondsPerLiquidityInside: secondsPerLiquidityInside,
      points: new BN(entry.points)
        .add(
          calculateReward(
            entry.event.liquidity,
            entry.previousSnapSecondsPerLiquidityInside,
            secondsPerLiquidityInside,
            calculatePointsToDistribute(lastSnapTimestamp, currentTimestamp),
            currentTimestamp.sub(lastSnapTimestamp)
          )
        )
        .toNumber(),
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
      previousSnapSecondsPerLiquidityInside: secondsPerLiquidityInside,
      points: calculateReward(
        entry.liquidity,
        entry.secondsPerLiquidityInsideInitial,
        secondsPerLiquidityInside,
        calculatePointsToDistribute(entry.currentTimestamp, currentTimestamp),
        currentTimestamp.sub(entry.currentTimestamp)
      ).toNumber(),
    });
  });

  return updatedNewOpen;
};

export const processNewClosed = (
  newClosed: [IActive, RemovePositionEvent][],
  lastSnapTimestamp: BN
) => {
  const updatedNewClosed: IClosed[] = [];

  newClosed.forEach((entry) => {
    updatedNewClosed.push({
      events: [entry[0].event, entry[1]],
      points: new BN(entry[0].points)
        .add(
          calculateReward(
            entry[1].liquidity,
            entry[0].previousSnapSecondsPerLiquidityInside,
            calculateSecondsPerLiquidityInside(
              entry[1].upperTick,
              entry[1].lowerTick,
              entry[1].currentTick,
              entry[1].upperTickSecondsPerLiquidityOutside,
              entry[1].lowerTickSecondsPerLiquidityOutside,
              entry[1].poolSecondsPerLiquidityGlobal
            ),
            calculatePointsToDistribute(
              lastSnapTimestamp,
              entry[1].currentTimestamp
            ),
            entry[1].currentTimestamp.sub(lastSnapTimestamp)
          )
        )
        .toNumber(),
    });
  });

  return updatedNewClosed;
};

export const processNewOpenClosed = (
  newOpenClosed: [CreatePositionEvent | null, RemovePositionEvent][]
) => {
  const updatedNewOpenClosed: IClosed[] = [];

  newOpenClosed.forEach((entry) => {
    updatedNewOpenClosed.push({
      events: [entry[0], entry[1]],
      points: !entry[0]
        ? 0
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
              entry[1].currentTimestamp
            ),
            entry[1].currentTimestamp.sub(entry[0].currentTimestamp)
          ).toNumber(),
    });
  });

  return updatedNewOpenClosed;
};

export const validateLogs = (logs: string[][], programId: PublicKey) => {
  const rawEvents: string[] = [];
  for (const txLog of logs) {
    txLog.map((log, index) => {
      if (
        log.slice(0, -4) === `Program ${programId.toBase58()} invoke` &&
        (txLog[index + 1] === "Program log: Instruction: CreatePosition" ||
          txLog[index + 1] === "Program log: Instruction: RemovePosition")
      ) {
        for (let i = index; i < txLog.length; i++) {
          if (txLog[i] === `Program ${programId.toBase58()} success`) {
            const associatedSlice = txLog.slice(index, i + 1);
            const event = associatedSlice.find((log) =>
              log.startsWith("Program data:")
            );
            if (event) {
              rawEvents.push(event);
            }
          }
        }
      }
    });
  }
  return rawEvents;
};
