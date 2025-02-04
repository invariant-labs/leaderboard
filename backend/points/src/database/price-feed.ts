import { Collections } from "../models/collections";
import { IPriceFeed } from "../services/types";
import { BaseCollection } from "./base";

export class PriceFeedCollection extends BaseCollection<IPriceFeed> {
  constructor() {
    super(Collections.PriceFeed);
  }

  getFeeds(): Promise<IPriceFeed[]> {
    return this.collection.find<IPriceFeed>({}).toArray();
  }

  updateFeeds(feeds: IPriceFeed[]) {
    const updates = feeds.map((feed) => {
      return this.collection.updateOne(
        { address: feed.id },
        { $set: feed },
        { upsert: true }
      );
    });

    return Promise.all(updates);
  }
}
