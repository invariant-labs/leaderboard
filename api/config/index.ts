import { VercelRequest, VercelResponse } from "@vercel/node";
import { POINTS_DECIMAL } from "../../src/math";
import {
  POINTS_PER_USD,
  PROMOTED_POOLS_MAINNET,
  PROMOTED_PAIRS_MAINNET,
} from "../../src/consts";
import LAST_SNAP_TIMESTAMP from "../../data/last_snap_timestamp_mainnet.json";

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
  const { lastSnapTimestamp } = LAST_SNAP_TIMESTAMP;
  const config = {
    refreshTime: 30 * 60,
    pointsDecimal: POINTS_DECIMAL,
    promotedPools: PROMOTED_POOLS_MAINNET,
    lastSnapTimestamp: lastSnapTimestamp,
    pointsPerUSD: POINTS_PER_USD,
    swapPairs: PROMOTED_PAIRS_MAINNET.map((pair) => {
      return {
        tokenX: pair.tokenX.toString(),
        tokenY: pair.tokenY.toString(),
      };
    }),
  };

  res.json(config);
}
