import { connectDb } from "./plugins/db.plugin";
import Fastify from "fastify";
import { Db, MongoClient } from "mongodb";
import fastifySchedule from "@fastify/schedule";
import { createLiquidityPointsJob } from "./jobs/liquidity-points";
import { Collections } from "./models/collections";

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
  // INSERT MOCK CONFIG
  app.db.collection("config").insertOne({
    lastSnapTimestamp: 0,
    poolsHashes: {},
    swapHashes: {},
  });

  app.db.collection(Collections.Events).insertOne({
    owner: "BtGH2WkM1oNyPVgzYT51xV2gJqHhVQ4QiGwWirBUW5xN",
    active: [],
    closed: [],
  });

  const liquidityPointsJob = createLiquidityPointsJob(app);
  app.scheduler.addSimpleIntervalJob(liquidityPointsJob);
});

app.addHook("onClose", async () => {
  app.scheduler.stop();
});

export default app;
