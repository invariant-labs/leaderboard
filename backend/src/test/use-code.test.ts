import { Keypair } from "@solana/web3.js";
import app from "../app";
import { FastifyInstance } from "fastify";
import { Collections } from "../models/collections";
import { getMessagePayload } from "@invariant-labs/points-sdk//src/utils";
import { signMessage } from "./test-utils";
import { decodeUTF8 } from "tweetnacl-util";

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
  let addr: Keypair;
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

    const payload = getMessagePayload(address.publicKey, code);
    const signature = signMessage(address, decodeUTF8(payload));
    const response = await fastify.inject({
      method: "POST",
      url: "/api/leaderboard/use-code",
      payload: {
        address: address.publicKey.toString(),
        code,
        signature: Buffer.from(signature).toString("base64"),
      },
    });

    const statusCode = response.statusCode;
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];
    const referrerElement = allRecordsAfter[allRecordsAfter.length - 2];
    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeUsed).toBe(code);
    expect(referrerElement.invited[0]).toBe(address.publicKey.toString());
    expect(lastElement.codeUsed).toBe(referrerElement.code);
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length - 1);
    expect(statusCode).toBe(200);
  });
  test("Try to use code  with message signed by someone else - should return 400", async () => {
    const signer = Keypair.generate();
    const address = Keypair.generate();
    const allRecordsBefore = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();

    const payload = getMessagePayload(signer.publicKey, code);
    const signature = signMessage(signer, decodeUTF8(payload));
    const response = await fastify.inject({
      method: "POST",
      url: "/api/leaderboard/use-code",
      payload: {
        address: address.publicKey.toString(),
        code,
        signature: Buffer.from(signature).toString("base64"),
      },
    });

    const statusCode = response.statusCode;
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length);
    expect(statusCode).toBe(400);
  });
  test("Use code", async () => {
    const address = Keypair.generate();
    addr = address;
    const allRecordsBefore = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();

    const payload = getMessagePayload(address.publicKey, code);
    const signature = signMessage(address, decodeUTF8(payload));
    const response = await fastify.inject({
      method: "POST",
      url: "/api/leaderboard/use-code",
      payload: {
        address: address.publicKey.toString(),
        code,
        signature: Buffer.from(signature).toString("base64"),
      },
    });

    const statusCode = response.statusCode;
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const lastElement = allRecordsAfter[allRecordsAfter.length - 1];
    const referrerElement = allRecordsAfter[allRecordsAfter.length - 3];
    expect(lastElement.address).toBe(address.publicKey.toString());
    expect(lastElement.codeUsed).toBe(code);
    expect(referrerElement.invited[1]).toBe(address.publicKey.toString());
    expect(referrerElement.invited.length).toBe(2);
    expect(lastElement.codeUsed).toBe(referrerElement.code);
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length - 1);
    expect(statusCode).toBe(200);
  });
  test("Use same code twice from same addr", async () => {
    const allRecordsBefore = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();

    const payload = getMessagePayload(addr.publicKey, code);
    const signature = signMessage(addr, decodeUTF8(payload));
    const response = await fastify.inject({
      method: "POST",
      url: "/api/leaderboard/use-code",
      payload: {
        address: addr.publicKey.toString(),
        code,
        signature: Buffer.from(signature).toString("base64"),
      },
    });

    const statusCode = response.statusCode;
    const allRecordsAfter = await fastify.db
      .collection(Collections.Referrals)
      .find({})
      .toArray();
    const referrerElementAfter = allRecordsAfter[allRecordsAfter.length - 3];
    const referrerElementBefore = allRecordsBefore[allRecordsAfter.length - 3];
    expect(referrerElementAfter.invited.length).toBe(
      referrerElementBefore.invited.length
    );
    expect(allRecordsBefore.length).toBe(allRecordsAfter.length);
    expect(statusCode).toBe(400);
  });
});
