import { Collections } from "@/models/collections";
import { FastifyInstance } from "fastify";
import { Collection, Document } from "mongodb";

export const getRandomCode = (): string => {
  const code = Math.random().toString(36).substring(2, 10);
  return code;
};

export class LeaderboardCollection {
  public db: Collection<Document>;

  public constructor(collection: Collections, app: FastifyInstance) {
    this.db = app.db.collection(collection);
  }

  async getAllElementsAsArray() {
    return await this.db.find({}).toArray();
  }

  async updateOne(searchFor: any, updateTo: any) {
    return await this.db.findOneAndUpdate(searchFor, { $set: updateTo });
  }

  async findOne(searchFor: any) {
    return await this.db.findOne(searchFor);
  }

  async insertOne(element: any) {
    return await this.db.insertOne(element);
  }
}
