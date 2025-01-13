import { connectDb } from "./plugins/db.plugin";
import leaderboardRoutes from "./routes/referral.routes";
import Fastify from "fastify";
import { Db, MongoClient } from "mongodb";
import fastifySchedule from "@fastify/schedule";
import cors from "@fastify/cors";
// import { fastifyRedis } from "@fastify/redis";

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

// app.register(fastifyRedis, { url: "redis://127.0.0.1" });
app.register(cors, {
  // TODO: change it to correct domain
  origin: "*",
});
app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });
app.register(fastifySchedule);

app.addHook("onClose", async () => {
  app.scheduler.stop();
});

export default app;
