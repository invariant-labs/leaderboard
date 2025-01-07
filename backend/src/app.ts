import { connectDb } from "@plugins/db.plugin";
import leaderboardRoutes from "@routes/referral.routes";
import Fastify from "fastify";
import { Db } from "mongodb";
import fastifySchedule from "@fastify/schedule";
// import { fastifyRedis } from "@fastify/redis";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
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

app.register(leaderboardRoutes, { prefix: "/api/leaderboard" });
app.register(fastifySchedule);

app.addHook("onClose", async () => {
  app.scheduler.stop();
});

export default app;
