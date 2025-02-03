import { Network } from "@invariant-labs/sdk-eclipse";

export const CONFIG = {
  SERVER: {
    PORT: 3000,
    HOST: "localhost",
    NODE_ENV: process.env.NODE_ENV || "development",
  },
  DATABASE: {
    DATABASE_URL: "mongodb://localhost:27017/points",
    DATABASE_NAME: "points",
  },
  JOBS: {
    LIQUIDITY_POINTS: {
      INTERVAL: 5,
      ID: "LIQUIDITY_POINTS",
    },
  },
  ECLIPSE: {
    RPC_URL: "https://eclipse.helius-rpc.com",
    NETWORK: Network.MAIN,
  },
};

export default CONFIG;

export const { SERVER, DATABASE, JOBS, ECLIPSE } = CONFIG;

export const { PORT, HOST } = SERVER;

export const { DATABASE_URL, DATABASE_NAME } = DATABASE;

export const { LIQUIDITY_POINTS } = JOBS;

export const { RPC_URL, NETWORK } = ECLIPSE;
