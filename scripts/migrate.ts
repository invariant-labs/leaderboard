import { Long, MongoClient, ObjectId } from "mongodb";
import {
  PointsBinaryConverter,
  SwapPointsBinaryConverter,
} from "../src/conversion";
import path from "path";
import { IPositions } from "../src/types";
import { BN } from "@coral-xyz/anchor";
import { POINTS_DENOMINATOR } from "../src/math";

const DATABASE_URL = "mongodb://localhost:27017/points";
const DATABASE_NAME = "points";
const CONFIG_COLLECTION = "config";
const POINTS_COLLECTION = "points";

const main = async () => {
  const client = new MongoClient(DATABASE_URL);
  await client.connect();
  const db = client.db(DATABASE_NAME);

  {
    const pairs_last_tx_hashes_mainnet = require("../data/pairs_last_tx_hashes_mainnet.json");
    const pools_last_tx_hashes_mainnet = require("../data/pools_last_tx_hashes_mainnet.json");
    const swap_blacklist = require("../data/swap_blacklist.json");

    const collection = db.collection(CONFIG_COLLECTION);
    const config = {
      _id: new ObjectId(),
      lastLpTimestamp: 0,
      lastSwapTimestamp: 0,
      lastDomainTimestamp: 0,
      poolsHashes: pools_last_tx_hashes_mainnet,
      swapHashes: pairs_last_tx_hashes_mainnet,
      blacklist: swap_blacklist,
    };

    await collection.insertOne(config);
    console.log("Config moved");
  }

  {
    const events: Record<
      string,
      IPositions
    > = require("../data/events_snap_mainnet.json");
    const lpPoints = PointsBinaryConverter.readBinaryFile(
      path.join(__dirname, "../data/points_mainnet.bin")
    );
    const swapPoints = SwapPointsBinaryConverter.readBinaryFile(
      path.join(__dirname, "../data/points_swap_mainnet.bin")
    );
    const staticSwapPoints: Record<
      string,
      number
    > = require("../data/static_swap.json");
    const contentProgramPoints: Record<
      string,
      { startTimestamp: number; endTimestamp: number; points: number }[]
    > = require(path.join("../data/content-program.json"));
    const staticPoints: Record<string, number> = require("../data/static.json");
    const domain = require("../data/domains.json");

    console.log("loaded all jsons");

    const docs = {};

    for (const [key, value] of Object.entries(events)) {
      const activePositions = value.active.map((a) => {
        return {
          pool: a.event.pool.toString(),
          positionId: new BN(a.event.id, "hex").toString(),
          liquidity: new BN(a.event.liquidity, "hex").toString(),
          upperTick: a.event.upperTick,
          lowerTick: a.event.lowerTick,
          currentTimestamp: new BN(a.event.currentTimestamp, "hex").toString(),
          secondsPerLiquidityInsideInitial: new BN(
            a.event.secondsPerLiquidityInsideInitial,
            "hex"
          ).toString(),
          points: new Long(new BN(a.points, "hex").toString(), true),
        };
      });

      if (docs[key] === undefined) {
        docs[key] = {
          address: key,
          activePositions: [],
          lpPoints: new Long("0", true),
          lpPointsHistory: [],
          swapPoints: new Long("0", true),
          swapPointsHistory: [],
          swapCounter: 0,
          totalPoints: new Long("0", true),
          updatedAt: new Date(),
        };
      }

      docs[key].activePositions = activePositions;
      docs[key].address = key;
    }

    for (const [key, value] of Object.entries(lpPoints)) {
      if (docs[key]?.lpPoints) {
        docs[key].lpPoints = new Long(
          new BN(docs[key].lpPoints.toString())
            .add(new BN(value.totalPoints.toString()))
            .toString(),
          true
        );
      } else {
        docs[key].lpPoints = new Long(value.totalPoints.toString(), true);
      }
      docs[key].lpPointsHistory = value.points24HoursHistory.map((p) => {
        return {
          diff: new Long(p.diff, true),
          timestamp: p.timestamp.toString(),
        };
      });
    }

    for (const [key, value] of Object.entries(swapPoints)) {
      if (docs[key] === undefined) {
        docs[key] = {
          address: key,
          activePositions: [],
          lpPoints: new Long("0", true),
          lpPointsHistory: [],
          swapPoints: new Long("0", true),
          swapPointsHistory: [],
          swapCounter: 0,
          totalPoints: new Long("0", true),
          updatedAt: new Date(),
        };
      }
      docs[key].swapPoints = new Long(
        new BN(docs[key].swapPoints.toString())
          .add(new BN(value.totalPoints.toString()))
          .toString(),
        true
      );

      docs[key].swapPointsHistory = value.points24HoursHistory.map((p) => {
        return {
          diff: new Long(p.diff, true),
          timestamp: p.timestamp.toString(),
        };
      });
      docs[key].swapCounter = value.swapsAmount;
    }

    for (const [key, value] of Object.entries(staticSwapPoints)) {
      if (docs[key] === undefined) {
        docs[key] = {
          address: key,
          activePositions: [],
          lpPoints: new Long("0", true),
          lpPointsHistory: [],
          swapPoints: new Long("0", true),
          swapPointsHistory: [],
          swapCounter: 0,
          totalPoints: new Long("0", true),
          updatedAt: new Date(),
        };
      }

      docs[key].swapPoints = new Long(
        new BN(docs[key].swapPoints.toString(), "hex")
          .add(new BN(value).mul(POINTS_DENOMINATOR))
          .toString(),
        true
      );
    }

    for (const [key, value] of Object.entries(domain.domains)) {
      docs[key].domain = value;
    }

    for (const [key, value] of Object.entries(docs)) {
      const v = value as any;
      docs[key].totalPoints = v.lpPoints.add(v.swapPoints);
    }

    for (const [key, value] of Object.entries(contentProgramPoints)) {
      if (docs[key] === undefined) {
        docs[key] = {
          address: key,
          activePositions: [],
          lpPoints: new Long("0", true),
          lpPointsHistory: [],
          swapPoints: new Long("0", true),
          swapPointsHistory: [],
          swapCounter: 0,
          totalPoints: new Long("0", true),
          updatedAt: new Date(),
        };
      }

      docs[key].totalPoints = new Long(
        new BN(docs[key].totalPoints.toString())
          .add(
            new BN(value.reduce((acc, cur) => acc + cur.points, 0)).mul(
              POINTS_DENOMINATOR
            )
          )
          .toString(),
        true
      );
    }

    for (const [key, value] of Object.entries(staticPoints)) {
      if (docs[key]) {
        docs[key].totalPoints = new Long(
          new BN(docs[key].totalPoints.toString())
            .add(new BN(value).mul(POINTS_DENOMINATOR))
            .toString(),
          true
        );
      } else {
        docs[key] = {
          address: key,
          activePositions: [],
          lpPoints: new Long("0", true),
          lpPointsHistory: [],
          swapPoints: new Long("0", true),
          swapPointsHistory: [],
          swapCounter: 0,
          totalPoints: new Long(
            new BN(value).mul(POINTS_DENOMINATOR).toString(),
            true
          ),
          updatedAt: new Date(),
        };
      }
    }

    const migratedData = Object.values(docs);
    const finalDataFile = path.join(
      __dirname,
      "../data/final_data_mainnet.json"
    );
    const finalData = require(finalDataFile);
    if (migratedData.length !== finalData.length) {
      console.log("Length mismatch", migratedData.length, finalData.length);
      return;
    }

    for (const [index, entry] of finalData.entries()) {
      const migratedEntry: any = migratedData.find(
        (e: any) => e.address === entry.address
      );

      if (migratedEntry) {
        if (
          !new BN(migratedEntry.totalPoints.toString()).eq(
            new BN(entry.points, "hex")
          )
        ) {
          console.log(entry, migratedEntry);

          console.log(
            "Total points Mismatch",
            entry.address,
            migratedEntry.totalPoints.toString(),
            new BN(entry.points, "hex").toString(),
            "index",
            index
          );
          break;
        }
        if (
          !new BN(migratedEntry.lpPoints.toString()).eq(
            new BN(entry.lpPoints, "hex")
          )
        ) {
          console.log(entry, migratedEntry);

          console.log(
            "LP points Mismatch",
            entry.address,
            migratedEntry.lpPoints.toString(),
            entry.lpPoints,
            "index",
            index
          );
        }
        if (
          !new BN(migratedEntry.swapPoints.toString()).eq(
            new BN(entry.swapPoints, "hex")
          )
        ) {
          console.log(entry, migratedEntry);

          console.log(
            "Swap points Mismatch",
            entry.address,
            migratedEntry.swapPoints.toString(),
            entry.swapPoints,
            "index",
            index
          );
        }
      } else {
        console.log("Not found", entry.address);
      }
    }

    console.log("Data validated");

    const bulkOps: any[] = [];
    const collection = db.collection(POINTS_COLLECTION);

    for (const [key, value] of Object.entries(docs)) {
      bulkOps.push({
        insertOne: {
          document: {
            address: key,
            ...(value as any),
          },
        },
      });
    }

    console.log("awaiting write");
    await collection.bulkWrite(bulkOps);
  }

  console.log("Data migrated successfully");

  return;
};

main();
