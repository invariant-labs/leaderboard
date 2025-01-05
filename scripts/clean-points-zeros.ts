import { Network } from "@invariant-labs/sdk-eclipse";
import fs from "fs";
import path from "path";
import { IPointsJson } from "../src/types";
import ECLIPSE_MAINNET_POINTS from "../data/points_mainnet.json";
import { BN } from "@coral-xyz/anchor";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const prepareFinalData = async (network: Network) => {
  let inputDataFile: string;
  let data: Record<string, IPointsJson>;
  switch (network) {
    case Network.MAIN:
      inputDataFile = path.join(__dirname, "../data/points_mainnet.json");
      data = ECLIPSE_MAINNET_POINTS as Record<string, IPointsJson>;
      break;
    // case Network.TEST:
    //   finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
    //   data = ECLIPSE_TESTNET_POINTS as Record<string, IPointsJson>;
    //   break;
    default:
      throw new Error("Unknown network");
  }

  const reducedData = {};
  Object.keys(data).forEach((addr) => {
    const trimmedHistory = data[addr].points24HoursHistory.filter((elem) =>
      new BN(elem.diff, "hex").gt(new BN(0))
    );
    reducedData[addr] = {
      ...data[addr],
      points24HoursHistory: trimmedHistory,
    };
  });

  console.log("Before reduction entries: ", Object.keys(data).length);
  console.log("After reduction entries: ", Object.keys(reducedData).length);

  fs.writeFileSync(inputDataFile, JSON.stringify(reducedData));
};

prepareFinalData(Network.MAIN).then(
  () => {
    console.log("Eclipse: Final data prepared!");
  },
  (err) => {
    console.log(err);
  }
);
