import { Collections } from "@/models/collections";
import { DATABASE_URL } from "@config/index";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { MongoClient } from "mongodb";

export const connectDb = fastifyPlugin(async (app: FastifyInstance) => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db("points");
  // if index already exists this is just ignored
  const indexes = [
    db.createIndex(
      Collections.Referrals,
      { referrer: 1, referee: 1, id: 1 },
      { unique: true }
    ),
  ];

  await Promise.all(indexes);
  app.decorate("db", db);
});
