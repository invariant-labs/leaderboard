import { VercelRequest, VercelResponse } from "@vercel/node";
import ECLIPSE_TESTNET_DATA from "../../data/final_data_testnet.json";
import ECLIPSE_MAINNET_DATA from "../../data/final_data_mainnet.json";

interface IEntry {
  rank: number;
  address: string;
  points: string;
  swapPoints: string;
  lpPoints: string;
  last24hPoints: string;
  last24hSwapPoints: string;
  last24hLpPoints: string;
  positions: number;
}
interface IData {
  user: IEntry | null;
  leaderboard: IEntry[];
  totalItems: number;
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
  let currentData: IEntry[];

  if (net === "eclipse-testnet") {
    currentData = ECLIPSE_MAINNET_DATA as IEntry[];
  } else if (net === "eclipse-mainnet") {
    currentData = ECLIPSE_MAINNET_DATA as IEntry[];
  } else {
    return res.status(400).send("INVALID NETWORK");
  }

  const offset = Number(req.query.offset) || 0;
  const size = Number(req.query.size) || undefined;
  const userItem = currentData.find((item) => item.address === pubkey);
  const userData = address && userItem ? userItem : null;
  const finalData: IData = {
    user: userData ? { ...userData } : null,
    leaderboard: currentData.slice(
      offset,
      size ? offset + size : currentData.length
    ),
    totalItems: currentData.length,
  };

  res.json(finalData);
}
