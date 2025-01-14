import { Network } from "@invariant-labs/sdk-eclipse";
import fs from "fs";
import path from "path";
import { IPointsHistoryJson, IPointsJson, ISwapPoints } from "./types";
// import ECLIPSE_TESTNET_POINTS from "../data/points_testnet.json";
import ECLIPSE_MAINNET_POINTS from "../data/points_mainnet.json";
import ECLIPSE_MAINNET_SWAP_POINTS from "../data/points_swap_mainnet.json";
import { BN } from "@coral-xyz/anchor";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const prepareFinalData = async (network: Network) => {
  let finalDataFile: string;
  let data: Record<string, IPointsJson>;
  let swapData: Record<string, ISwapPoints>;
  switch (network) {
    case Network.MAIN:
      finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
      data = ECLIPSE_MAINNET_POINTS as Record<string, IPointsJson>;
      swapData = ECLIPSE_MAINNET_SWAP_POINTS as Record<string, ISwapPoints>;
      break;
    // case Network.TEST:
    //   finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
    //   data = ECLIPSE_TESTNET_POINTS as Record<string, IPointsJson>;
    //   break;
    default:
      throw new Error("Unknown network");
  }
  const allAddresses = Array.from(
    new Set([...Object.keys(data), ...Object.keys(swapData)])
  );

  const mergedData = allAddresses
    .map((addr) => {
      const userLpData = data[addr];
      const userSwapData = swapData[addr];
      const points = userLpData ? userLpData.totalPoints : "00";
      const swapPoints = userSwapData ? userSwapData.points : "00";
      const totalPoints = new BN(points, "hex").add(new BN(swapPoints, "hex"));
      const positions = userLpData ? userLpData.positionsAmount : 0;
      const last24hPoints = userLpData
        ? userLpData.points24HoursHistory.reduce(
            (acc, history) => acc.add(new BN(history.diff, "hex")),
            new BN(0)
          )
        : new BN(0);

      const last24hPointsSwaps = userSwapData
        ? userSwapData.points24HoursHistory.reduce(
            (acc, history) => acc.add(new BN(history.diff, "hex")),
            new BN(0)
          )
        : new BN(0);

      return {
        address: addr,
        points,
        swapPoints,
        totalPoints,
        last24hPoints,
        last24hPointsSwaps,
        positions,
      };
    })
    .sort((a, b) =>
      new BN(b.totalPoints, "hex").cmp(new BN(a.totalPoints, "hex"))
    )
    .map((item, index) => {
      return { ...item, rank: index + 1 };
    });

  fs.writeFileSync(finalDataFile, JSON.stringify(mergedData));
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
