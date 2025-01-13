import { Network } from "@invariant-labs/sdk-eclipse";
import fs from "fs";
import path from "path";
import { IPointsHistoryJson, IPointsJson, IReferral } from "./types";
// import ECLIPSE_TESTNET_POINTS from "../data/points_testnet.json";
import ECLIPSE_MAINNET_POINTS from "../data/points_mainnet.json";
import { BN } from "@coral-xyz/anchor";
import { getReferralCodes } from "./utils";
import { REFERRER_CUT, USE_CODE_PERCENTAGE } from "./consts";
import { PERCENTAGE_DENOMINATOR } from "./math";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const prepareFinalData = async (network: Network) => {
  let finalDataFile: string;
  let data: Record<string, IPointsJson>;
  switch (network) {
    case Network.MAIN:
      finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
      data = ECLIPSE_MAINNET_POINTS as Record<string, IPointsJson>;
      break;
    // case Network.TEST:
    //   finalDataFile = path.join(__dirname, "../data/final_data_testnet.json");
    //   data = ECLIPSE_TESTNET_POINTS as Record<string, IPointsJson>;
    //   break;
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

  const referrals: Record<string, IReferral> = await getReferralCodes();

  const bonusPoints = {};

  for (const [address, referral] of Object.entries(referrals)) {
    let useCodeBonus = new BN(0);
    let referrersBonus = new BN(0);

    if (referral.codeUsed && data[address]) {
      // 5% boost for self generated points
      useCodeBonus = new BN(data[address].totalPoints, "hex")
        .mul(USE_CODE_PERCENTAGE)
        .div(PERCENTAGE_DENOMINATOR);
    }

    if (referral.invited.length !== 0) {
      for (const referred of referral.invited) {
        if (data[referred]) {
          // 10% of referred points
          referrersBonus = referrersBonus.add(
            new BN(data[referred].totalPoints, "hex")
              .mul(REFERRER_CUT)
              .div(PERCENTAGE_DENOMINATOR)
          );
        }
      }
    }

    bonusPoints[address] = {
      useCodeBonus,
      referrersBonus,
    };
  }

  console.log(bonusPoints);

  const finalData = Object.keys(data)
    .map((key) => {
      return {
        address: key,
        rank: rank[key],
        last24hPoints: last24HoursPoints[key],
        points: new BN(data[key].totalPoints, "hex").add(
          bonusPoints[key] ? bonusPoints[key].useCodeBonus : new BN(0)
        ),
        referralPoints: bonusPoints[key]?.referrersBonus,
        referrers: referrals[key]?.invited,
        positions: data[key].positionsAmount,
      };
    })
    .sort((a, b) => a.rank - b.rank);

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
