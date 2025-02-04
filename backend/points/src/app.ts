import { connectDb } from "./plugins/db.plugin";
import Fastify, { FastifyInstance } from "fastify";
import { Db, MongoClient } from "mongodb";
import fastifySchedule from "@fastify/schedule";
import { createPointsUpdateJob } from "./jobs/points-update";
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
  insertMockData(app);
  const pointsJob = createPointsUpdateJob(app);
  app.scheduler.addSimpleIntervalJob(pointsJob);
});

app.addHook("onClose", async () => {
  app.scheduler.stop();
});

export default app;

const insertMockData = (app: FastifyInstance) => {
  // INSERT MOCK CONFIG
  app.db.collection(Collections.Config).insertOne({
    lastSnapTimestamp: 0,
    poolsHashes: {
      HRgVv1pyBLXdsAddq4ubSqo8xdQWRrYbvmXqEDtectce:
        "5Sfk4EFfnJubEGngkgSVtDBoYELSQiqzHRyRi6zacx21wsi2LgS8RUWy6uwCEpyoNMhYJtMudY9dGqrD9Dtizunh",
      "86vPh8ctgeQnnn8qPADy5BkzrqoH5XjMCWvkd4tYhhmM":
        "4AtvjaCR3J4mcrt3ckr7hks3sDx6JatqiMBaix5zh4UiRNytx2vt9AZYcV1dBPSCyVy2YtpHhzxiWERcPaEASNrf",
      FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9:
        "3EsX6B7Tg58mdN5kSARVvVAY8Xof1yYvfKdyHcZj8oyWA6TcvMgddhtFMebBtQDnuCWdGwMq4sYk7HePBWvsWkJa",
    },
    swapHashes: {},
    blacklist: [],
  });
};
