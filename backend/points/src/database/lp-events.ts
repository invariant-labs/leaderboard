import { Collections, IEventItem } from "../models/collections";
import { IActive, IClosed } from "../services/types";
import { BaseCollection } from "./base";

export class EventsCollection extends BaseCollection<IEventItem> {
  constructor() {
    super(Collections.Events);
  }

  async getUserEvents(owner: string): Promise<IEventItem | null> {
    return this.collection.findOne({ owner });
  }

  async getActiveEvents(): Promise<IEventItem[]> {
    return this.collection.find({ "active.0": { $exists: true } }).toArray();
  }

  async addActiveEntry(entry: IActive): Promise<void> {
    await this.collection.updateOne(
      { owner: entry.event.owner },
      { $push: { active: entry } },
      { upsert: true }
    );
  }

  async addClosedEntry(entry: IClosed): Promise<void> {
    await this.collection.updateOne(
      { owner: entry.events[1].owner },
      { $push: { closed: entry } },
      { upsert: true }
    );
  }

  async getAll(): Promise<IEventItem[]> {
    return this.collection.find().toArray();
  }
}
