import { Collections } from "@/models/collections";
import app from "@/app";
import { Collection as MongoCollection, Document } from "mongodb";

export class Collection {
  public db: MongoCollection<Document>;

  public constructor(collection: Collections) {
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
