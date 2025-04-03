import { Network } from "@invariant-labs/sdk-eclipse";
import fs from "fs";
import path from "path";
import { IPointsHistoryJson, IPointsJson, SwapPointsEntry } from "./types";
import { BN } from "@coral-xyz/anchor";
import { PointsBinaryConverter, SwapPointsBinaryConverter } from "./conversion";
import { POINTS_DENOMINATOR } from "./math";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const prepareFinalData = async (network: Network) => {
  let finalDataFile: string;
  let finalDataSwapFile: string;
  let finalDataLpFile: string;
  let data: Record<string, IPointsJson>;
  let swapData: Record<string, SwapPointsEntry>;
  let contentProgramData: Record<
    string,
    { startTimestamp: number; endTimestamp: number; points: number }[]
  >;
  let staticData: Record<string, number>;
  let staticSwap: Record<string, number>;

  switch (network) {
    case Network.MAIN:
      finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
      finalDataSwapFile = path.join(
        __dirname,
        "../data/final_data_swap_mainnet.json"
      );
      finalDataLpFile = path.join(
        __dirname,
        "../data/final_data_lp_mainnet.json"
      );
      data = PointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_mainnet.bin")
      );
      swapData = SwapPointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_swap_mainnet.bin")
      );
      staticData = JSON.parse(
        fs.readFileSync(path.join(__dirname, "../data/static.json"), "utf-8")
      );
      contentProgramData = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../data/content-program.json"),
          "utf-8"
        )
      );
      staticSwap = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../data/static_swap.json"),
          "utf-8"
        )
      );
      break;
    case Network.TEST:
      finalDataSwapFile = path.join(
        __dirname,
        "../data/final_data_swap_testnet.json"
      );
      finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
      finalDataLpFile = path.join(
        __dirname,
        "../data/final_data_lp_testnet.json"
      );
      data = PointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_testnet.bin")
      );
      staticData = {};
      staticSwap = {};
      contentProgramData = {};
      swapData = SwapPointsBinaryConverter.readBinaryFile(
        path.join(__dirname, "../data/points_swap_testnet.bin")
      );

      break;
    default:
      throw new Error("Unknown network");
  }

  const rankLp: Record<string, number> = {};
  const last24HoursPointsLp: Record<string, BN> = {};
  const sortedKeysLp = Object.keys(data).sort((a, b) =>
    new BN(data[b].totalPoints, "hex").sub(new BN(data[a].totalPoints, "hex"))
  );

  sortedKeysLp.forEach((key, index) => {
    rankLp[key] = index + 1;
    last24HoursPointsLp[key] = data[key].points24HoursHistory.reduce(
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

  const finalDataLp = Object.keys(data)
    .map((key) => {
      return {
        address: key,
        rank: rankLp[key],
        last24hPoints: last24HoursPointsLp[key],
        points: new BN(data[key].totalPoints),
        positions: data[key].positionsAmount,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  fs.writeFileSync(finalDataLpFile, JSON.stringify(finalDataLp));

  Object.keys(staticSwap).forEach((key) => {
    if (swapData[key]) {
      const v = swapData[key] as SwapPointsEntry;
      v.totalPoints = new BN(v.totalPoints, "hex")
        .add(new BN(staticSwap[key]).mul(POINTS_DENOMINATOR))
        .toString();
      swapData[key] = v;
    } else {
      swapData[key] = {
        points24HoursHistory: [],
        swapsAmount: 0,
        totalPoints: new BN(staticSwap[key]).mul(POINTS_DENOMINATOR).toString(),
      };
    }
  });

  const rankSwap: Record<string, number> = {};
  const last24HoursPointsSwap: Record<string, BN> = {};
  const sortedKeysSwap = Object.keys(swapData).sort((a, b) =>
    new BN(swapData[b].totalPoints).sub(new BN(swapData[a].totalPoints))
  );

  sortedKeysSwap.forEach((key, index) => {
    rankSwap[key] = index + 1;
    last24HoursPointsSwap[key] = swapData[key].points24HoursHistory.reduce(
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

  const finalDataSwaps = Object.keys(swapData)
    .map((key) => {
      return {
        address: key,
        rank: rankSwap[key],
        last24hPoints: last24HoursPointsSwap[key],
        points: new BN(swapData[key].totalPoints),
        swaps: swapData[key].swapsAmount,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  fs.writeFileSync(finalDataSwapFile, JSON.stringify(finalDataSwaps));

  const allAddresses = Array.from(
    new Set([
      ...Object.keys(data),
      ...Object.keys(swapData),
      ...Object.keys(staticData),
      ...Object.keys(contentProgramData),
    ])
  );

  const finalData = allAddresses
    .map((key) => {
      const lp = data[key];
      const swap = swapData[key];

      const staticPoints = staticData[key]
        ? new BN(staticData[key]).mul(POINTS_DENOMINATOR)
        : new BN(0);
      const contentProgramPoints = contentProgramData[key]
        ? new BN(
            contentProgramData[key].reduce((acc, cur) => acc + cur.points, 0)
          ).mul(POINTS_DENOMINATOR)
        : new BN(0);

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

      const totalPoints = lpPoints
        .add(swapPoints)
        .add(staticPoints)
        .add(contentProgramPoints);

      return {
        address: key,
        points: totalPoints,
        last24hPoints,
        lpPoints,
        swapPoints,
      };
    })
    .sort((a, b) => b.points.cmp(a.points))
    .map((item, index) => {
      return { ...item, rank: index + 1 };
    });

  fs.writeFileSync(finalDataFile, JSON.stringify(finalData));
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
