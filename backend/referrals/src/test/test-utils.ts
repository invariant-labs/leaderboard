import { Collections } from "../models/collections";
import { DATABASE_URL } from "../config/index";
import { Keypair } from "@solana/web3.js";
import { MongoClient } from "mongodb";
import nacl from "tweetnacl";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const resetDatabase = async () => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db("points");
  await db.dropDatabase();

  let indexes = [
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
};

export const assertThrowsAsync = async (fn: Promise<any>, word?: string) => {
  try {
    await fn;
  } catch (e: any) {
    let err;
    if (e.code) {
      err = "0x" + e.code.toString(16);
    } else {
      err = e.toString();
    }
    if (word) {
      const regex = new RegExp(`${word}$`);
      if (!regex.test(err)) {
        console.log(err);
        throw new Error("Invalid Error message");
      }
    }
    return;
  }
  throw new Error("Function did not throw error");
};

export const signMessage = (signer: Keypair, message: Uint8Array) => {
  const signature = nacl.sign.detached(message, signer.secretKey);
  return signature;
};
