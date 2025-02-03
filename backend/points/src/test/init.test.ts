import app from "../app";
import { resetDatabase } from "./test-utils";
import { FastifyInstance } from "fastify";

describe("init leaderboard", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    await resetDatabase();

    fastify = app;
    await fastify.ready();
    console.log("ready");
  });

  afterAll(async () => {
    console.log("cleaning up");
    await fastify.close();
  });

  test("init", async () => {
    console.log("ok");
  });
});
