import app from "@/app";
import { resetDatabase } from "./test-utils";
import { FastifyInstance } from "fastify";

describe("Collect events", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    await resetDatabase();

    fastify = app;
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  test("shoot three arrows", async () => {
    console.log("ok");
  });
});
