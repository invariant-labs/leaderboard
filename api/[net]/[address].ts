import { VercelRequest, VercelResponse } from "@vercel/node";
import ECLIPSE_TESTNET_DATA from "../../data/points_testnet.json";
import ECLIPSE_MAINNET_DATA from "../../data/points_mainnet.json";
import { IPointsHistory, IPointsJson } from "../../src/types";

interface IData {
  user: {
    rank: number;
    address: string;
    points: number;
    last24hPoints: number;
    positions: number;
  } | null;
  leaderboard: {
    rank: number;
    address: string;
    points: number;
    last24hPoints: number;
    positions: number;
  }[];
}

export default function (req: VercelRequest, res: VercelResponse) {
  // @ts-expect-error
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  const { net, address } = req.query;
  const pubkey = address as string;
  let data: IData;
  let currentData: Record<string, IPointsJson>;

  if (net === "eclipse-testnet") {
    currentData = ECLIPSE_TESTNET_DATA as Record<string, IPointsJson>;
  } else if (net === "eclipse-mainnet") {
    currentData = ECLIPSE_MAINNET_DATA as Record<string, IPointsJson>;
  } else {
    return res.status(400).send("INVALID NETWORK");
  }

  const rank: Record<string, number> = {};
  const last24HoursPoints: Record<string, number> = {};
  const sortedKeys = Object.keys(currentData).sort(
    (a, b) => currentData[b].totalPoints - currentData[a].totalPoints
  );

  sortedKeys.forEach((key, index) => {
    rank[key] = index + 1;
    last24HoursPoints[key] = currentData[key].points24HoursHistory.reduce(
      (acc: number, curr: IPointsHistory) => (acc += curr.diff),
      0
    );
  });

  const userData =
    address && currentData[pubkey]
      ? {
          rank: rank[pubkey],
          last24hPoints: last24HoursPoints[pubkey],
          points: currentData[pubkey].totalPoints,
          address: pubkey,
          positions: currentData[pubkey].positionsAmount,
        }
      : null;
  const finalData: IData = {
    user: userData ? { ...userData } : null,
    leaderboard: Object.keys(currentData).map((key) => {
      return {
        address: key,
        rank: rank[key],
        last24hPoints: last24HoursPoints[key],
        points: currentData[key].totalPoints,
        positions: currentData[key].positionsAmount,
      };
    }),
  };
  data = finalData;

  res.json(data);
}
