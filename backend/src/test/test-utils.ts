import { Collections } from "@/models/collections";
import { DATABASE_URL } from "@config/index";
import { MongoClient } from "mongodb";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const resetDatabase = async () => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db("points");
  await db.dropDatabase();

  let indexes = [db.createIndex(Collections.Referrals, {}, { unique: true })];

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
