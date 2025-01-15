import { BN } from "@coral-xyz/anchor";
import path from "path";
import { writeFileSync, readFileSync } from "fs";
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

  const historical = {};
  const events: Record<string, IPositions> = {};
  const eventsObject: Record<string, IPositions> = JSON.parse(
    readFileSync(eventsFileName, "utf-8")
  );

  Object.keys(eventsObject).forEach((address) => {
    const data = eventsObject[address];
    const pointsForClosed = data.closed.reduce(
      (acc, closed) => acc.add(new BN(closed.points, "hex")),
      new BN(0)
    );
    if (pointsForClosed.gt(new BN(0))) {
      historical[address] = pointsForClosed;
    }

    events[address] = {
      active: data.active,
      closed: [],
    };
  });

  writeFileSync(historicalFileName, JSON.stringify(historical));
  writeFileSync(eventsFileName, JSON.stringify(events));
};

main();
