import { Collections, IConfig } from "../models/collections";
import { BaseCollection } from "./base";

export class ConfigCollection extends BaseCollection<IConfig> {
  constructor() {
    super(Collections.Config);
  }

  getConfig(): Promise<IConfig | null> {
    return this.collection.findOne<IConfig>({});
  }

  setConfig(config: IConfig) {
    return this.collection.updateOne(
      { _id: config._id },
      { $set: config },
      { upsert: true }
    );
  }
}
