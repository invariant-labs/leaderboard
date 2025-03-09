import { BN } from "@coral-xyz/anchor";
import path from "path";
import { writeFileSync, readFileSync } from "fs";
import { IActive, IPositions } from "../src/types";
import { PublicKey } from "@solana/web3.js";

const POOL = new PublicKey("E2B7KUFwjxrsy9cC17hmadPsxWHD1NufZXTyrtuz8YxC");

const main = () => {
  const historicalFileName = path.join(
    __dirname,
    "../data/historical_points_for_closed_mainnet.json"
  );
  const eventsFileName = path.join(
    __dirname,
    "../data/events_snap_mainnet.json"
  );

  const historical: Record<string, string> = JSON.parse(
    readFileSync(historicalFileName, "utf-8")
  );
  const events: Record<string, IPositions> = {};
  const eventsObject: Record<string, IPositions> = JSON.parse(
    readFileSync(eventsFileName, "utf-8")
  );

  Object.keys(eventsObject).forEach((address) => {
    const data = eventsObject[address];

    const filteredPositions: IActive[] = [];
    let pointsForPositions = new BN(0);
    data.active.forEach((p) => {
      if (POOL.equals(new PublicKey(p.event.pool))) {
        pointsForPositions = pointsForPositions.add(new BN(p.points, "hex"));
      } else {
        filteredPositions.push(p);
      }
    });

    if (pointsForPositions.gt(new BN(0))) {
      if (historical[address]) {
        historical[address] = new BN(historical[address], "hex").add(
          pointsForPositions
        );
      } else {
        historical[address] = pointsForPositions;
      }
    }

    events[address] = {
      active: filteredPositions,
      closed: data.closed,
    };
  });

  for (const entry of Object.values(events)) {
    for (const position of entry.active) {
      if (POOL.equals(new PublicKey(position.event.pool))) {
        console.log(position);
      }
    }
  }

  writeFileSync(historicalFileName, JSON.stringify(historical));
  writeFileSync(eventsFileName, JSON.stringify(events));
};

main();
