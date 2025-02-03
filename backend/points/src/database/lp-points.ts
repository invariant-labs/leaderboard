import { Collections, IUserPoints } from "../models/collections";
import { IPointsHistory } from "../services/types";
import { BaseCollection } from "./base";

export class LpPointsCollection extends BaseCollection<IUserPoints> {
  constructor() {
    super(Collections.LiquidityPoints);
  }

  async getUserPoints(owner: string): Promise<IUserPoints | null> {
    return this.collection.findOne({ owner });
  }

  async updatePointsHistory(
    owner: string,
    pointsHistory: IPointsHistory[]
  ): Promise<void> {
    await this.collection.updateOne(
      { owner },
      { $set: { points24HoursHistory: pointsHistory } }
    );
  }

  async getActivePointChanges(): Promise<IUserPoints[]> {
    return this.collection
      .find({
        last24HoursPoints: {
          $ne: "0",
          $exists: true,
        },
      })
      .toArray();
  }
}
