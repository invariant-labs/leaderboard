import { ObjectId } from "mongodb";
import { IPointsHistory, IPositions } from "../services/types";

export enum Collections {
  Config = "config",

  Events = "events",
  LiquidityPoints = "liquidityPoints",

  PriceFeed = "priceFeed",
  SwapPoints = "swapPoints",

  Domains = "domains",
  StaticPoints = "staticPoints",
  HistoricalPoints = "historicalPoints",

  Leaderboard = "leaderboard",
}

export interface IConfig extends MongoItem {
  lastSnapTimestamp: number;
  poolsHashes: Record<string, string>;
  swapHashes: Record<string, string>;
}

export interface IEventItem extends IPositions, MongoItem {
  owner: string;
}

export interface IHistoricalPoints extends MongoItem {
  owner: string;
  points: string;
}

export interface IUserPoints extends MongoItem {
  owner: string;
  totalPoints: string;
  positionsAmount: number;
  last24HoursPoints: string;
  points24HoursHistory: IPointsHistory[];
}

interface MongoItem {
  _id: ObjectId;
}
