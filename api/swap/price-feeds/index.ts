import { VercelRequest, VercelResponse } from "@vercel/node";
import PRICE_FEED_DATA from "../../../data/last_price_feed_mainnet.json";
import { mapPythToAddress } from "../../../src/utils";
import { PROMOTED_PAIRS_MAINNET } from "../../../src/consts";

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
  const formattedData = mapPythToAddress(
    PRICE_FEED_DATA,
    PROMOTED_PAIRS_MAINNET
  );
  res.json(formattedData);
}
