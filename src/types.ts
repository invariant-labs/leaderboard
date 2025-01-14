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
  diff: BN | string;
  timestamp: BN | string;
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
export interface IPromotedPool {
  address: PublicKey;
  pointsPerSecond: BN;
  startCountTimestamp: BN;
}

export interface IPromotedPair {
  tokenX: PublicKey;
  xDecimal: number;
  tokenY: PublicKey;
  yDecimal: number;
  startTxHash: string;
  feedXId: string;
  feedYId: string;
}

export interface ISwapPoints {
  points: string;
  points24HoursHistory: IPointsHistoryJson[];
}

export interface IPriceFeed {
  ema_price: {
    conf: string;
    expo: number;
    price: string;
    publish_time: number;
  };
  id: string;
  metadata: {
    prev_publish_time: number;
    proof_available_time: number;
    slot: number;
  };
  price: {
    conf: string;
    expo: number;
    price: string;
    publish_time: number;
  };
}
export interface PointsEntry {
  totalPoints: string; // hex string
  positionsAmount: number;
  points24HoursHistory: IPointsHistory[];
}

export interface SwapPointsEntry {
  totalPoints: string; // hex string
  points24HoursHistory: IPointsHistory[];
}

export type PointsData = Record<string, PointsEntry>;
export type SwapPointsData = Record<string, SwapPointsEntry>;
