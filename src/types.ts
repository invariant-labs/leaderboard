import { BN } from "@coral-xyz/anchor";
import {
  CreatePositionEvent,
  PoolStructure,
  RemovePositionEvent,
  Tick,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { PublicKey } from "@solana/web3.js";

export interface IActive {
  event: CreatePositionEvent;
  points: BN;
}
export interface IClosed {
  events: [CreatePositionEvent | null, RemovePositionEvent];
  points: BN;
}
export interface IPositions {
  active: IActive[];
  closed: IClosed[];
}

export interface IPoolAndTicks {
  pool: PublicKey;
  poolStructure: PoolStructure;
  ticks: Tick[];
  pointsPerSecond: BN;
}
export interface IPointsHistory {
  diff: BN;
  timestamp: BN;
}
export interface IPoints {
  totalPoints: BN;
  positionsAmount: number;
  last24HoursPoints: BN;
  rank: number;
  points24HoursHistory: IPointsHistory[];
}
export interface IPointsHistoryJson {
  diff: string;
  timestamp: string;
}
export interface IPointsJson {
  totalPoints: string;
  positionsAmount: number;
  points24HoursHistory: IPointsHistoryJson[];
}
export interface ILastSnapData {
  lastSnapTimestamp: string;
  lastPointsDistributed: string;
  lastPointsThatShouldHaveBeenDistributed: string;
}
export interface IPromotedPool {
  address: PublicKey;
  pointsPerSecond: BN;
}
