import { Keypair } from "@solana/web3.js";
import app from "../app";
import { FastifyInstance } from "fastify";
import { getCodeFromAddress } from "@controllers/leaderboard.controller";
import { Collections } from "@/models/collections";

describe("Get code endpoint", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = app;
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  test("Get code for address", async () => {
    const address = Keypair.generate();
    const allRecordsBefore = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const response = await fastify.inject({
      method: "GET",
      url: "/api/leaderboard/get-code",
      payload: { address: address.publicKey.toString() },
    });

    const statusCode = response.statusCode;
    const body = JSON.parse(response.body);
    const expectedCode = getCodeFromAddress(address.publicKey.toString());
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];
    console.log(response);
    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeOwned).toBe(expectedCode);
    expect(lastElement.codeUsed).toBe(null);
    expect(body.code).toBe(expectedCode);
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length - 1);
    expect(statusCode).toBe(200);
  });
});
