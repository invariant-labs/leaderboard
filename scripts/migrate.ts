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
      pairsHashes: pairs_last_tx_hashes_mainnet,
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

      if (docs[key].swapPoints) {
        docs[key].swapPoints = new Long(
          new BN(docs[key].swapPoints.toString())
            .add(new BN(value.totalPoints.toString()))
            .toString(),
          true
        );
      } else {
        docs[key].swapPoints = new Long(value.totalPoints.toString(), true);
      }
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
        new BN(docs[key].swapPoints.toString())
          .add(new BN(value).mul(POINTS_DENOMINATOR))
          .toString(),
        true
      );
    }

    for (const [key, value] of Object.entries(staticPoints)) {
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
    console.log(docs["BtGH2WkM1oNyPVgzYT51xV2gJqHhVQ4QiGwWirBUW5xN"]);

    const promises: any[] = [];
    const collection = db.collection(POINTS_COLLECTION);

    for (const [key, value] of Object.entries(docs)) {
      promises.push(
        collection.updateOne(
          { address: key },
          { $set: value as any },
          { upsert: true }
        )
      );
    }

    console.log("awaiting promises");
    await Promise.all(promises);

    console.log("Data migrated successfully");
  }

  return;
};

main();
