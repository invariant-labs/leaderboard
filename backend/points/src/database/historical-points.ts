import { Collections, IHistoricalPoints } from "../models/collections";
import { BaseCollection } from "./base";

export class HistoricalPointsCollection extends BaseCollection<IHistoricalPoints> {
  constructor() {
    super(Collections.HistoricalPoints);
  }

  getHistoricalPoints(owner: string): Promise<IHistoricalPoints | null> {
    return this.collection.findOne<IHistoricalPoints>({ owner });
  }

  setHistoricalPoints(params: IHistoricalPoints) {
    return this.collection.updateOne(
      { owner: params.owner },
      { $set: params },
      { upsert: true }
    );
  }
}
