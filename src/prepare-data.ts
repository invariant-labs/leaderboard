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
  let finalDataSwapFile: string;
  let data: Record<string, IPointsJson>;
  let swapData: Record<string, SwapPointsEntry>;
  switch (network) {
    case Network.MAIN:
      finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
      finalDataSwapFile = path.join(
        __dirname,
        "../data/final_data_swap_mainnet.json"
      );
      data = PointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_mainnet.bin")
      );
      swapData = SwapPointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_swap_mainnet.bin")
      );
      break;
    case Network.TEST:
      finalDataSwapFile = path.join(
        __dirname,
        "../data/final_data_swap_testnet.json"
      );
      finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
      data = {};
      swapData = SwapPointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_swap_testnet.bin")
      );
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
      (acc: BN, curr: IPointsHistoryJson) => {
        // TODO: User only decimal after 24h
        try {
          return acc.add(new BN(curr.diff));
        } catch (e) {
          return acc.add(new BN(curr.diff, "hex"));
        }
      },
      new BN(0)
    );
  });

  const finalData = Object.keys(data)
    .map((key) => {
      return {
        address: key,
        rank: rank[key],
        last24hPoints: last24HoursPoints[key],
        points: new BN(data[key].totalPoints),
        positions: data[key].positionsAmount,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  fs.writeFileSync(finalDataFile, JSON.stringify(finalData, null, 2));

  const rankSwap: Record<string, number> = {};
  const last24HoursPointsSwap: Record<string, BN> = {};
  const sortedKeysSwap = Object.keys(swapData).sort((a, b) =>
    new BN(swapData[b].totalPoints, "hex").sub(
      new BN(swapData[a].totalPoints, "hex")
    )
  );

  sortedKeysSwap.forEach((key, index) => {
    rankSwap[key] = index + 1;
    last24HoursPointsSwap[key] = data[key].points24HoursHistory.reduce(
      (acc: BN, curr: IPointsHistoryJson) => {
        // TODO: User only decimal after 24h
        try {
          return acc.add(new BN(curr.diff));
        } catch (e) {
          return acc.add(new BN(curr.diff, "hex"));
        }
      },
      new BN(0)
    );
  });

  const finalDataSwaps = Object.keys(data)
    .map((key) => {
      return {
        address: key,
        rank: rankSwap[key],
        last24hPoints: last24HoursPointsSwap[key],
        points: new BN(swapData[key].totalPoints),
      };
    })
    .sort((a, b) => a.rank - b.rank);

  fs.writeFileSync(finalDataFile, JSON.stringify(finalDataSwaps, null, 2));
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
