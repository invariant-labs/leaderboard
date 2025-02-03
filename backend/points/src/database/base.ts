import { Collection as MongoCollection, Document } from "mongodb";
import app from "../app";
import { Collections } from "../models/collections";

export abstract class BaseCollection<T extends Document> {
  protected collection: MongoCollection<T>;

  constructor(collectionName: Collections) {
    this.collection = app.db.collection(collectionName);
  }
}
