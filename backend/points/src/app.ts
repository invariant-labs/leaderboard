import { connectDb } from "./plugins/db.plugin";
import Fastify, { FastifyInstance } from "fastify";
import { Db, MongoClient } from "mongodb";
import fastifySchedule from "@fastify/schedule";
import { createPointsUpdateJob } from "./jobs/points-update";
import { Collections } from "./models/collections";
import { createRequire } from "module";
// import LAST_POOL_HASHES from "../../../data/pools_last_tx_hashes_mainnet.json";
// import LAST_PAIR_HASHES from "../../../data/pairs_last_tx_hashes_mainnet.json";
// import BLACKLIST from "../../../data/swap_blacklist.json";
declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    mongoClient: MongoClient;
  }
}

const app = Fastify({
  logger: process.env.NODE_ENV !== "test",
  ignoreTrailingSlash: true,
});

app.register(connectDb, {
  forceClose: true,
});
app.register(fastifySchedule);

app.ready().then(() => {
  // insertMockData(app);
  const pointsJob = createPointsUpdateJob(app);
  app.scheduler.addSimpleIntervalJob(pointsJob);
});

app.addHook("onClose", async () => {
  app.scheduler.stop();
});

export default app;

const insertMockData = (app: FastifyInstance) => {
  // INSERT MOCK CONFIG
  // const require = createRequire(import.meta.url);
  // const LAST_POOL_HASHES = require("../../../data/pools_last_tx_hashes_mainnet.json");
  // const LAST_PAIR_HASHES = require("../../../data/pairs_last_tx_hashes_mainnet.json");
  // const BLACKLIST = require("../../../data/swap_blacklist.json");
  // app.db.collection(Collections.Config).deleteMany({});
  // app.db.collection(Collections.Config).insertOne({
  //   lastSnapTimestamp: 0,
  //   poolsHashes: LAST_POOL_HASHES,
  //   swapHashes: LAST_PAIR_HASHES,
  //   blacklist: BLACKLIST,
  // });
};
