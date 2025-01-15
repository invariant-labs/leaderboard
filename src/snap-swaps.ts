import {
  Network,
  Market,
  getMarketAddress,
  IWallet,
  Pair,
  parseEvent,
} from "@invariant-labs/sdk-eclipse";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import {
  DAY,
  MAX_SIGNATURES_PER_CALL,
  PROMOTED_PAIRS_MAINNET,
  PROMOTED_PAIRS_TESTNET,
} from "./consts";
import {
  fetchAllSignatures,
  fetchTransactionLogs,
  retryOperation,
} from "./utils";
import { IPriceFeed, IPromotedPair } from "./types";
import { SwapEvent } from "@invariant-labs/sdk-eclipse/lib/market";
import { calculatePointsForSwap, getTimestampInSeconds } from "./math";
import { HermesClient } from "@pythnetwork/hermes-client";
import { SwapPointsBinaryConverter } from "./conversion";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const createSnapshotForNetwork = async (network: Network) => {
  let provider: AnchorProvider;
  let pointsFileName: string;
  let PROMOTED_PAIRS: IPromotedPair[];
  let pairsFileName: string;
  let priceFeedsFileName: string;

  const hermesClient: HermesClient = new HermesClient(
    "https://hermes.pyth.network",
    {}
  );

  switch (network) {
    case Network.MAIN:
      provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
      pointsFileName = path.join(__dirname, "../data/points_swap_mainnet.bin");
      pairsFileName = path.join(
        __dirname,
        "../data/pairs_last_tx_hashes_mainnet.json"
      );
      priceFeedsFileName = path.join(
        __dirname,
        "../data/last_price_feed_mainnet.json"
      );
      PROMOTED_PAIRS = PROMOTED_PAIRS_MAINNET;
      break;
    case Network.TEST:
      provider = AnchorProvider.local(
        "https://testnet.dev2.eclipsenetwork.xyz"
      );
      pointsFileName = path.join(__dirname, "../data/points_swap_testnet.bin");
      pairsFileName = path.join(
        __dirname,
        "../data/pairs_last_tx_hashes_testnet.json"
      );
      priceFeedsFileName = path.join(
        __dirname,
        "../data/last_price_feed_mainnet.json"
      );
      PROMOTED_PAIRS = PROMOTED_PAIRS_TESTNET;
      break;
    default:
      throw new Error("Unknown network");
  }

  const blacklist: string[] = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/swap_blacklist.json"),
      "utf-8"
    )
  );

  const connection = provider.connection;
  const programId = new PublicKey(getMarketAddress(network));

  const market = Market.build(
    network,
    provider.wallet as IWallet,
    connection,
    programId
  );

  const previousHashes = JSON.parse(fs.readFileSync(pairsFileName, "utf-8"));

  const newHashes = {};
  const sigs = (
    await Promise.all(
      PROMOTED_PAIRS.map(({ tokenX, tokenY, startTxHash }) => {
        const refAddr = market.getEventOptAccountForSwap(
          new Pair(
            tokenX,
            tokenY,
            // NOTE: redundant
            { fee: new BN(0), tickSpacing: 1 }
          )
        ).address;
        const key = tokenX.toString() + "-" + tokenY.toString();
        const previousTxHash = previousHashes[key] ?? startTxHash;
        return retryOperation(
          fetchAllSignatures(connection, refAddr, previousTxHash)
        ).then((signatures) => {
          if (signatures.length > 0) {
            newHashes[key] = signatures[0];
          } else {
            newHashes[key] = previousTxHash;
          }
          return signatures;
        });
      })
    )
  ).flat();

  const txLogs = await retryOperation(
    fetchTransactionLogs(connection, sigs, MAX_SIGNATURES_PER_CALL)
  );

  const priceFeeds = ((
    await hermesClient.getLatestPriceUpdates(
      Array.from(
        new Set(PROMOTED_PAIRS.map((p) => [p.feedXId, p.feedYId]).flat())
      )
    )
  ).parsed ?? fs.readFileSync(priceFeedsFileName, "utf-8")) as IPriceFeed[];

  if (!priceFeeds) {
    throw new Error(
      "NOTE: Add events without price feeds to separate file and resolve them later"
    );
  }

  const currentTimestamp = getTimestampInSeconds();
  const finalLogs = txLogs.flat();

  const eventLogs: string[] = [];

  finalLogs.map((log, index) => {
    if (
      log.startsWith("Program data:") &&
      finalLogs[index - 1].startsWith(`Program log: INVARIANT: SWAP`)
    )
      eventLogs.push(log.split("Program data: ")[1]);
  });

  const previousPoints =
    SwapPointsBinaryConverter.readBinaryFile(pointsFileName);

  const pointsChange = {};
  eventLogs
    .map((log) => market.eventDecoder.decode(log))
    .filter((decodedEvent) => !!decodedEvent)
    .forEach((decodedEvent) => {
      const event = parseEvent(decodedEvent) as SwapEvent;
      const { swapper, fee, xToY, tokenX, tokenY } = event;
      if (blacklist.some((item) => item === swapper.toString())) return;
      const associatedPair = PROMOTED_PAIRS.find(
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
      if (previousPoints[key]) {
        previousPoints[key].totalPoints = new BN(
          previousPoints[key].totalPoints,
          "hex"
        ).add(points);
      } else {
        previousPoints[key] = { totalPoints: points, points24HoursHistory: [] };
      }

      pointsChange[key] = new BN(pointsChange[key], "hex").add(points);
    });

  Object.keys(previousPoints).forEach((key) => {
    if (previousPoints[key] && previousPoints[key].points24HoursHistory) {
      const prevHistory = previousPoints[key].points24HoursHistory;
      const recentHistory = prevHistory.filter((entry) =>
        new BN(entry.timestamp, "hex").gt(currentTimestamp.sub(DAY))
      );
      if (pointsChange[key]) {
        recentHistory.push({
          diff: pointsChange[key],
          timestamp: currentTimestamp,
        });
      }
      previousPoints[key].points24HoursHistory = recentHistory;
    } else {
      previousPoints[key].points24HoursHistory = [
        {
          diff: pointsChange[key],
          timestamp: currentTimestamp,
        },
      ];
    }
  });

  SwapPointsBinaryConverter.writeBinaryFile(pointsFileName, previousPoints);
  fs.writeFileSync(pairsFileName, JSON.stringify(newHashes));
  fs.writeFileSync(priceFeedsFileName, JSON.stringify(priceFeeds));
};

createSnapshotForNetwork(Network.TEST).then(
  () => {
    console.log("Eclipse: Testnet snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);

// createSnapshotForNetwork(Network.MAIN).then(
//   () => {
//     console.log("Eclipse: Mainnet swap snapshot done!");
//   },
//   (err) => {
//     console.log(err);
//   }
// );
