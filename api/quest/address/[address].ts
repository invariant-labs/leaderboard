import { VercelRequest, VercelResponse } from "@vercel/node";
import ECLIPSE_MAINNET_POINTS from "../../../data/final_data_mainnet.json";
import { BN } from "@coral-xyz/anchor";
import { POINTS_DENOMINATOR } from "../../../src/math";

interface IQuestAddressData {
  totalPoints: string;
  completed: boolean;
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

  const { address } = req.query;

  const pubkey = address ? (address as string) : null;

  const data: {
    rank: number;
    address: string;
    points: string;
    last24hPoints: string;
    lpPoints: string;
    swapPoints: string;
  }[] = ECLIPSE_MAINNET_POINTS as {
    rank: number;
    address: string;
    points: string;
    last24hPoints: string;
    lpPoints: string;
    swapPoints: string;
  }[];

  const defaultReturn = {
    totalPoints: new BN(0),
    completed: false,
  };
  const questTreshhold: BN = new BN(25000).mul(POINTS_DENOMINATOR);
  const userItem = data.find((item) => item.address === pubkey);
  const userData: IQuestAddressData =
    pubkey && userItem
      ? {
          totalPoints: userItem.points,
          completed: new BN(userItem.points, "hex").gt(questTreshhold),
        }
      : defaultReturn;

  res.json(userData);
}
