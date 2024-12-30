import { VercelRequest, VercelResponse } from "@vercel/node";
import ECLIPSE_MAINNET_POINTS from "../../../data/points_mainnet.json";
import { IPointsJson } from "../../../src/types";
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

  const data: Record<string, IPointsJson> = ECLIPSE_MAINNET_POINTS as Record<
    string,
    IPointsJson
  >;

  const defaultReturn = {
    totalPoints: new BN(0),
    completed: false,
  };
  const questTreshhold: BN = new BN(100000).mul(POINTS_DENOMINATOR);
  const userData: IQuestAddressData =
    pubkey && data[pubkey]
      ? {
          totalPoints: data[pubkey].totalPoints,
          completed: new BN(data[pubkey].totalPoints, "hex").gt(questTreshhold),
        }
      : defaultReturn;

  res.json(userData);
}
