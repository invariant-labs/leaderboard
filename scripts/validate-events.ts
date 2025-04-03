import path from "path";
import { readFileSync } from "fs";
import { IPositions } from "../src/types";

const main = () => {
  const historicalFileName = path.join(
    __dirname,
    "../data/historical_points_for_closed_mainnet.json"
  );
  const eventsFileName = path.join(
    __dirname,
    "../data/events_snap_mainnet.json"
  );

  const eventsObject: Record<string, IPositions> = JSON.parse(
    readFileSync(eventsFileName, "utf-8")
  );

  Object.keys(eventsObject).forEach((address) => {
    const data = eventsObject[address];
    const ids = data.active.map((p) => p.event.id);
    const areAllUnique = new Set(ids).size === ids.length;
    if (!areAllUnique) {
      console.log("Not all ids are unique", address);
    }
  });
};

main();
