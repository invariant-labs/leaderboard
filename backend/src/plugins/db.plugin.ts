import { Collections } from "@/models/collections";
import { DATABASE_NAME, DATABASE_URL } from "@config/index";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { MongoClient } from "mongodb";

export const connectDb = fastifyPlugin(async (app: FastifyInstance) => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db(DATABASE_NAME);
  // if index already exists this is just ignored
  const indexes = [db.createIndex("referrals", { index: 1 }, { unique: true })];
  await Promise.all(indexes);
  app.decorate("db", db);
});
