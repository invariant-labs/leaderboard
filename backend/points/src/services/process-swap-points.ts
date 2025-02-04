import {
  clog,
  fetchAllSignatures,
  fetchTransactionLogs,
  retryOperation,
} from "./utils";
import BN from "bn.js";
import { Connection } from "@solana/web3.js";
import { Market, Pair, parseEvent } from "@invariant-labs/sdk-eclipse";
import { MAX_SIGNATURES_PER_CALL, PROMOTED_PAIRS_MAINNET } from "./consts";
import { SwapEvent } from "@invariant-labs/sdk-eclipse/lib/market";
import { IPriceFeed } from "./types";
import {
  calculatePointsForSwap,
  getTimestampInSeconds,
  isConfidenceAcceptable,
} from "./math";
import { HermesClient } from "@pythnetwork/hermes-client";
import { FEE_TIERS } from "@invariant-labs/sdk-eclipse/lib/utils";
import { PriceFeedCollection } from "../database/price-feed";
import { SwapPointsCollection } from "../database/swap-points";

export const processSwapPoints = async (
  connection: Connection,
  market: Market,
  swapHashes: Record<string, string>,
  blacklist: string[]
): Promise<Record<string, string>> => {
  clog("Handling swap points");

  const hermesClient: HermesClient = new HermesClient(
    "https://hermes.pyth.network",
    {}
  );

  const priceFeedsCollection = new PriceFeedCollection();
  const swapPointsCollection = new SwapPointsCollection();

  const sigs: string[] = [];

  for (const { tokenX, tokenY, startTxHash } of PROMOTED_PAIRS_MAINNET) {
    for (const tier of FEE_TIERS) {
      const refAddr = new Pair(tokenX, tokenY, tier).getAddress(
        market.program.programId
      );

      const previousTxHash = swapHashes[refAddr.toBase58()] ?? startTxHash;

      const signatures = await retryOperation(
        fetchAllSignatures(connection, refAddr, previousTxHash)
      );

      if (signatures.length > 0) {
        swapHashes[refAddr.toBase58()] = signatures[0];
      } else {
        swapHashes[refAddr.toBase58()] = previousTxHash;
      }

      sigs.push(...signatures);
    }
  }

  const txLogs = await retryOperation(
    fetchTransactionLogs(connection, sigs, MAX_SIGNATURES_PER_CALL)
  );

  let priceFeeds: IPriceFeed[] = [];
  const previousFeeds = await priceFeedsCollection.getFeeds();
  const pythFeeds = (
    await hermesClient.getLatestPriceUpdates(
      Array.from(
        new Set(
          PROMOTED_PAIRS_MAINNET.map((p) => [p.feedXId, p.feedYId]).flat()
        )
      )
    )
  ).parsed;

  if (pythFeeds) {
    priceFeeds = pythFeeds.map((feed) => {
      const previousFeed = previousFeeds.find(
        (f) => f.id === feed.id
      ) as IPriceFeed;
      if (!feed.price) {
        return previousFeed;
      }

      const { price, conf } = feed.price;

      if (isConfidenceAcceptable(new BN(price), new BN(conf))) {
        return feed as IPriceFeed;
      } else {
        return previousFeed;
      }
    });
  } else {
    priceFeeds = previousFeeds;
  }

  const currentTimestamp = getTimestampInSeconds();
  const finalLogs = txLogs.flat();

  const eventLogs: string[] = [];

  finalLogs.map((log: string, index: number) => {
    if (
      log.startsWith("Program data:") &&
      finalLogs[index - 1].startsWith(`Program log: INVARIANT: SWAP`)
    )
      eventLogs.push(log.split("Program data: ")[1]);
  });

  const events = eventLogs
    .map((log) => market.eventDecoder.decode(log))
    .filter((decodedEvent) => !!decodedEvent);

  const pointsChange: Record<string, { points: BN; swaps: number }> = {};
  for (const rawEvent of events) {
    const event = parseEvent(rawEvent) as SwapEvent;
    const { swapper, fee, xToY, tokenX, tokenY } = event;
    if (blacklist.some((item) => item === swapper.toString())) {
      continue;
    }
    const associatedPair = PROMOTED_PAIRS_MAINNET.find(
      (p) => p.tokenX.equals(tokenX) && p.tokenY.equals(tokenY)
    );

    if (!associatedPair) {
      throw new Error("Associated pair not found");
    }

    const feed = priceFeeds.find(
      (feed) =>
        `0x${feed.id}` ===
        (xToY ? associatedPair.feedXId : associatedPair.feedYId)
    );

    if (!feed) {
      throw new Error("Price feed not found");
    }

    const priceDecimals = Math.abs(feed.price.expo);
    const priceFeed = new BN(feed.price.price);

    const points = calculatePointsForSwap(
      fee,
      xToY ? associatedPair.xDecimal : associatedPair.yDecimal,
      priceFeed,
      priceDecimals
    );
    const key = swapper.toString();
    pointsChange[key].points = new BN(pointsChange[key].points).add(points);
    pointsChange[key].swaps++;
  }

  await swapPointsCollection.updatePoints(pointsChange, currentTimestamp);
  await priceFeedsCollection.updateFeeds(priceFeeds);

  clog("Swap points handled");
  return swapHashes;
};
