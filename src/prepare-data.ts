import { Network } from "@invariant-labs/sdk-eclipse";
import fs from "fs";
import path from "path";
import { IPointsHistoryJson, IPointsJson, SwapPointsEntry } from "./types";
import { BN } from "@coral-xyz/anchor";
import { PointsBinaryConverter, SwapPointsBinaryConverter } from "./conversion";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const prepareFinalData = async (network: Network) => {
  let finalDataFile: string;
  let data: Record<string, IPointsJson>;
  let swapData: Record<string, SwapPointsEntry>;
  switch (network) {
    case Network.MAIN:
      finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
      data = PointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_mainnet.bin")
      );
      swapData = SwapPointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_swap_mainnet.bin")
      );
      break;
    case Network.TEST:
      finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
      data = {};
      swapData = SwapPointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_swap_testnet.bin")
      );
      break;
    default:
      throw new Error("Unknown network");
  }
  const allAddresses = Array.from(
    new Set([...Object.keys(data), ...Object.keys(swapData)])
  );

  const finalData = allAddresses
    .map((key) => {
      const showLogs = key === "BtGH2WkM1oNyPVgzYT51xV2gJqHhVQ4QiGwWirBUW5xN";

      const lp = data[key];
      const swap = swapData[key];

      const lpPoints = lp ? new BN(lp.totalPoints) : new BN(0);
      const last24hLpPoints = lp
        ? lp.points24HoursHistory.reduce(
            (acc: BN, curr: IPointsHistoryJson) => {
              try {
                return acc.add(new BN(curr.diff));
              } catch (e) {
                return acc.add(new BN(curr.diff, "hex"));
              }
            },
            new BN(0)
          )
        : new BN(0);

      const swapPoints = swap ? new BN(swap.totalPoints) : new BN(0);
      const last24hSwapPoints = swap
        ? swap.points24HoursHistory.reduce(
            (acc: BN, curr: IPointsHistoryJson) => acc.add(new BN(curr.diff)),
            new BN(0)
          )
        : new BN(0);

      const last24hPoints = last24hLpPoints.add(last24hSwapPoints);
      const totalPoints = lpPoints.add(swapPoints);
      if (showLogs) {
        console.log(totalPoints, last24hLpPoints);
      }
      const positions = lp ? lp.positionsAmount : 0;

      return {
        address: key,
        points: totalPoints,
        last24hPoints,
        lpPoints,
        swapPoints,
        last24hLpPoints,
        last24hSwapPoints,
        positions,
      };
    })
    .sort((a, b) => b.points.cmp(a.points))
    .map((item, index) => {
      return { ...item, rank: index + 1 };
    });

  fs.writeFileSync(finalDataFile, JSON.stringify(finalData));
};

prepareFinalData(Network.TEST).then(
  () => {
    console.log("Eclipse: Final data prepared!");
  },
  (err) => {
    console.log(err);
  }
);

prepareFinalData(Network.MAIN).then(
  () => {
    console.log("Eclipse: Final data prepared!");
  },
  (err) => {
    console.log(err);
  }
);
