import { Keypair } from "@solana/web3.js";
import app from "../app";
import { FastifyInstance } from "fastify";
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
      url: `/api/leaderboard/get-code/${address.publicKey.toString()}`,
    });
    const statusCode = response.statusCode;
    const body = JSON.parse(response.body);
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];
    code = body.code;
    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeUsed).toBe(null);
    expect(body.code).toBe(lastElement.code);
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
      method: "POST",
      url: "/api/leaderboard/use-code",
      payload: { address: address.publicKey.toString(), code },
    });
    console.log(response);
    const statusCode = response.statusCode;
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];
    const referrerElement = allRecordsAfter[allRecordsAfter.length - 2];
    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeUsed).toBe(code);
    expect(lastElement.codeUsed).toBe(referrerElement.code);
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length - 1);
    expect(statusCode).toBe(200);
  });
});
