import { Network } from "@invariant-labs/sdk-eclipse";
import fs from "fs";
import path from "path";
import { IPointsHistoryJson, IPointsJson } from "./types";
import ECLIPSE_TESTNET_POINTS from "../data/points_testnet.json";
import ECLIPSE_MAINNET_POINTS from "../data/points_mainnet.json";
import { BN } from "@coral-xyz/anchor";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const prepareFinalData = async (network: Network) => {
  let finalDataFile: string;
  let data: Record<string, IPointsJson>;
  switch (network) {
    case Network.MAIN:
      finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
      data = ECLIPSE_MAINNET_POINTS;
      break;
    case Network.TEST:
      finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
      data = ECLIPSE_TESTNET_POINTS;
      break;
    default:
      throw new Error("Unknown network");
  }
  const rank: Record<string, number> = {};
  const last24HoursPoints: Record<string, BN> = {};
  const sortedKeys = Object.keys(data).sort((a, b) =>
    new BN(data[b].totalPoints, "hex").sub(new BN(data[a].totalPoints, "hex"))
  );

  sortedKeys.forEach((key, index) => {
    rank[key] = index + 1;
    last24HoursPoints[key] = data[key].points24HoursHistory.reduce(
      (acc: BN, curr: IPointsHistoryJson) => acc.add(new BN(curr.diff, "hex")),
      new BN(0)
    );
  });

  const finalData = Object.keys(data)
    .map((key) => {
      return {
        address: key,
        rank: rank[key],
        last24hPoints: last24HoursPoints[key],
        points: new BN(data[key].totalPoints, "hex"),
        positions: data[key].positionsAmount,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  fs.writeFileSync(finalDataFile, JSON.stringify(finalData, null, 2));
};

// prepareFinalData(Network.TEST).then(
//   () => {
//     console.log("Eclipse: Final data prepared!");
//   },
//   (err) => {
//     console.log(err);
//   }
// );

prepareFinalData(Network.MAIN).then(
  () => {
    console.log("Eclipse: Final data prepared!");
  },
  (err) => {
    console.log(err);
  }
);
