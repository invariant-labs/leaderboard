import { BN } from "@coral-xyz/anchor";
import {
  CreatePositionEvent,
  PoolStructure,
  PositionWithAddress,
  Tick,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import path from "path";
import {
  calculateSecondsPerLiquidityGlobal,
  calculateSecondsPerLiquidityInside,
} from "../src/math";
import { IActive, IPositions } from "../src/types";
import { Network } from "@invariant-labs/sdk-eclipse";

require("dotenv").config();

const POOL = new PublicKey("FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9");
const NETWORK = Network.MAIN;

export const insertPreviousPositionsFromPool = async (
  pool: PublicKey,
  network: Network
) => {
  let eventsSnapFilename: string;
  switch (network) {
    case Network.MAIN:
      eventsSnapFilename = path.join(
        __dirname,
        "../data/events_snap_mainnet.json"
      );
      break;
    case Network.TEST:
      eventsSnapFilename = path.join(
        __dirname,
        "../data/events_snap_testnet.json"
      );
      break;
    default:
      throw new Error("Unknown network");
  }
  const positionsFilePath = path.join(
    __dirname,
    `../pool_data/${pool}/position.json`
  );
  const ticksFilePath = path.join(__dirname, `../pool_data/${pool}/ticks.json`);
  const timestampFilePath = path.join(
    __dirname,
    `../pool_data/${pool}/timestamp.json`
  );
  const poolStateFilePath = path.join(
    __dirname,
    `../pool_data/${pool}/pool.json`
  );
  const positions: PositionWithAddress[] = JSON.parse(
    fs.readFileSync(positionsFilePath, "utf-8")
  );
  const ticks: Tick[] = JSON.parse(fs.readFileSync(ticksFilePath, "utf-8"));
  const poolState: PoolStructure = JSON.parse(
    fs.readFileSync(poolStateFilePath, "utf-8")
  );
  const timestamp: string = JSON.parse(
    fs.readFileSync(timestampFilePath, "utf-8")
  );

  const secondsPerLiquidityGlobal = calculateSecondsPerLiquidityGlobal(
    new BN(poolState.secondsPerLiquidityGlobal, "hex"),
    new BN(poolState.liquidity, "hex"),
    new BN(poolState.lastTimestamp, "hex"),
    new BN(timestamp, "hex")
  );
  const events: IActive[] = positions.map((position) => {
    const upperTick: Tick = ticks.find(
      (tick) => tick.index === position.upperTickIndex
    )!;
    const lowerTick: Tick = ticks.find(
      (tick) => tick.index === position.lowerTickIndex
    )!;
    const secondsPerLiquidityInsideInitial: BN =
      calculateSecondsPerLiquidityInside(
        position.upperTickIndex,
        position.lowerTickIndex,
        poolState.currentTickIndex,
        new BN(upperTick.secondsPerLiquidityOutside, "hex"),
        new BN(lowerTick.secondsPerLiquidityOutside, "hex"),
        secondsPerLiquidityGlobal
      );
    const event: CreatePositionEvent = {
      owner: new PublicKey(position.owner),
      pool: new PublicKey(position.pool),
      id: new BN(position.id, "hex"),
      liquidity: new BN(position.liquidity, "hex"),
      upperTick: position.upperTickIndex,
      lowerTick: position.lowerTickIndex,
      currentTimestamp: new BN(timestamp, "hex"),
      secondsPerLiquidityInsideInitial,
    };
    return { event, points: new BN(0) };
  });

  const eventsObject: Record<string, IPositions> = JSON.parse(
    fs.readFileSync(eventsSnapFilename, "utf-8")
  );

  events.forEach((entry) => {
    const ownerKey = entry.event.owner.toString();
    if (!eventsObject[ownerKey]) {
      eventsObject[ownerKey] = { active: [], closed: [] };
    }
    eventsObject[ownerKey].active.push(entry);
  });

  fs.writeFileSync(eventsSnapFilename, JSON.stringify(eventsObject, null, 2));
};

insertPreviousPositionsFromPool(POOL, NETWORK);
