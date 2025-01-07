import { Keypair } from "@solana/web3.js";
import app from "../app";
import { FastifyInstance } from "fastify";
import { getCodeFromAddress } from "@controllers/leaderboard.controller";
import { Collections } from "@/models/collections";

describe("Use code endpoint", () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = app;
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  let code: string;

  test("Get code for address", async () => {
    const address = Keypair.generate();
    const allRecordsBefore = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const response = await fastify.inject({
      method: "GET",
      url: "/api/leaderboard/get-code",
      body: { address: address.publicKey.toString() },
    });

    const statusCode = response.statusCode;
    const body = JSON.parse(response.body);
    const expectedCode = getCodeFromAddress(address.publicKey.toString());
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];

    code = body.code;

    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeOwned).toBe(expectedCode);
    expect(lastElement.codeUsed).toBe(null);
    expect(body.code).toBe(expectedCode);
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length - 1);
    expect(statusCode).toBe(200);
  });
  test("Use code", async () => {
    const address = Keypair.generate();
    const allRecordsBefore = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const response = await fastify.inject({
      method: "GET",
      url: "/api/leaderboard/use-code",
      body: { address: address.publicKey.toString(), code },
    });

    const statusCode = response.statusCode;
    const expectedCode = getCodeFromAddress(address.publicKey.toString());
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];
    const referrerElement = allRecordsAfter[allRecordsAfter.length - 2];

    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeOwned).toBe(expectedCode);
    expect(lastElement.codeUsed).toBe(code);
    expect(lastElement.codeUsed).toBe(referrerElement.codeOwned);
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length - 1);
    expect(statusCode).toBe(200);
  });
});
