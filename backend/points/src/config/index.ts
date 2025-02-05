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
    POINTS_UPDATE: {
      INTERVAL: 60 * 3,
      ID: "POINTS_UPDATE",
      RUN_IMMEDIATELY: true,
    },
  },
};

export default CONFIG;

export const { SERVER, DATABASE, JOBS } = CONFIG;

export const { PORT, HOST } = SERVER;

export const { DATABASE_URL, DATABASE_NAME } = DATABASE;

export const { POINTS_UPDATE } = JOBS;
