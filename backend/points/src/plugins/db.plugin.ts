import { Collections } from "../models/collections";
import { DATABASE_NAME, DATABASE_URL } from "../config/index";
import { FastifyInstance } from "fastify";
import fastifyPlugin from "fastify-plugin";
import { MongoClient } from "mongodb";

export const connectDb = fastifyPlugin(async (app: FastifyInstance) => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db(DATABASE_NAME);
  // if index already exists this is just ignored
  // const indexes = [
  //   // db.createIndex(Collections.points, { address: 1 }, { unique: true }),
  //   // db.createIndex(Collections.points, { code: 1, codeUsed: 1 }),
  //   // db.createIndex(Collections.points, { invited: 1 }),
  // ];
  // await Promise.all(indexes);
  app.decorate("db", db);
  app.decorate("mongoClient", client);
});
