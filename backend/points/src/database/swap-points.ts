import BN from "bn.js";
import { Collections, ISwapPoints } from "../models/collections";
import { BaseCollection } from "./base";
import { DAY } from "../services/consts";

export class SwapPointsCollection extends BaseCollection<ISwapPoints> {
  constructor() {
    super(Collections.SwapPoints);
  }

  async updatePoints(
    pointsChange: Record<string, { points: BN; swaps: number }>,
    timestamp: BN | string
  ): Promise<void> {
    const currentTimestamp = new BN(timestamp);
    const oneDayAgo = currentTimestamp.sub(DAY);

    const updates = Object.entries(pointsChange).map(
      async ([address, changes]) => {
        const currentState = await this.collection.findOne({
          address,
        });

        if (!currentState) {
          return this.collection.updateOne(
            {
              address,
            },
            {
              $set: {
                totalPoints: changes.points.toString("hex"),
                swapsAmount: changes.swaps,
                points24HoursHistory: [
                  {
                    diff: changes.points.toString("hex"),
                    timestamp: currentTimestamp.toString("hex"),
                  },
                ],
              },
            },
            { upsert: true }
          );
        }

        const newTotalPoints = new BN(currentState.totalPoints).add(
          changes.points
        );
        const newSwapsAmount = currentState.swapsAmount + changes.swaps;
        const filteredHistory = currentState.points24HoursHistory.filter(
          (entry) => new BN(entry.timestamp).gte(oneDayAgo)
        );

        const newHistory = [
          ...filteredHistory,
          {
            diff: changes.points.toString("hex"),
            timestamp: currentTimestamp.toString("hex"),
          },
        ];

        const newState: ISwapPoints = {
          ...currentState,
          totalPoints: newTotalPoints.toString("hex"),
          swapsAmount: newSwapsAmount,
          points24HoursHistory: newHistory,
        };

        return this.collection.updateOne(
          { address },
          { $set: newState },
          { upsert: true }
        );
      }
    );

    await Promise.all(updates);
  }
}
