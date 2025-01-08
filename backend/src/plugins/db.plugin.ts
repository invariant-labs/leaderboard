import { Collections } from "../models/collections";
import { DATABASE_NAME, DATABASE_URL } from "../config/index";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { MongoClient } from "mongodb";

export const connectDb = fastifyPlugin(async (app: FastifyInstance) => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db(DATABASE_NAME);
  // TODO: Configure indexes
  // if index already exists this is just ignored
  const indexes = [
    db.createIndex(
      Collections.Referrals,
      {
        address: 1,
        code: 1,
        codeUsed: 1,
        signature: 1,
        message: 1,
        invited: 1,
      },
      { unique: true }
    ),
  ];
  await Promise.all(indexes);
  app.decorate("db", db);
  app.decorate("mongoClient", client);
});
