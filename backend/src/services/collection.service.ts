import { Collections } from "../models/collections";
import app from "../app";
import { Collection as MongoCollection, Document } from "mongodb";

export class Collection {
  public db: MongoCollection<Document>;

  public constructor(collection: Collections) {
    this.db = app.db.collection(collection);
  }

  async getReferrersAndReferred() {
    return await this.db
      .aggregate([
        {
          $match: {
            $or: [
              { invited: { $exists: true, $not: { $size: 0 } } },
              { codeUsed: { $exists: true, $ne: null } },
            ],
          },
        },
        {
          $project: {
            address: 1,
            restOfData: {
              signature: 1,
              code: 1,
              codeUsed: 1,
              invited: 1,
            },
          },
        },
        {
          $group: {
            _id: "$address",
            data: { $first: "$restOfData" },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: { k: "$_id", v: "$data" },
            },
          },
        },
      ])
      .toArray();
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

  async addToInvitedList(code: string, address: string) {
    return await this.db.findOneAndUpdate(
      {
        code,
        invited: { $nin: [address] },
      },
      {
        $addToSet: { invited: address },
      }
    );
  }

  async insertOrUpdateOne(
    address: string,
    newCode: string,
    codeUsed: string,
    signature: string
  ) {
    return await this.db.findOneAndUpdate(
      { address },
      {
        $set: { codeUsed },
        $setOnInsert: {
          address,
          code: newCode,
          invited: [],
          signature,
        },
      },
      {
        upsert: true,
      }
    );
  }

  async insertOne(element: any) {
    return await this.db.insertOne(element);
  }
}
