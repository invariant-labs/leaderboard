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
import {
  calculatePointsForSwap,
  getTimestampInSeconds,
  isConfidenceAcceptable,
} from "./math";
import { HermesClient } from "@pythnetwork/hermes-client";
import { SwapPointsBinaryConverter } from "./conversion";
import { FEE_TIERS } from "@invariant-labs/sdk-eclipse/lib/utils";

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

  const sigs: string[] = [];

  for (const { tokenX, tokenY, startTxHash } of PROMOTED_PAIRS) {
    for (const tier of FEE_TIERS) {
      const refAddr = new Pair(tokenX, tokenY, tier).getAddress(
        market.program.programId
      );

      const previousTxHash = previousHashes[refAddr.toBase58()] ?? startTxHash;

      const signatures = await retryOperation(
        fetchAllSignatures(connection, refAddr, previousTxHash)
      );

      if (signatures.length > 0) {
        newHashes[refAddr.toBase58()] = signatures[0];
      } else {
        newHashes[refAddr.toBase58()] = previousTxHash;
      }

      sigs.push(...signatures);
    }
  }

  const txLogs = await retryOperation(
    fetchTransactionLogs(connection, sigs, MAX_SIGNATURES_PER_CALL)
  );

  let priceFeeds: IPriceFeed[] = [];
  const previousFeeds = JSON.parse(
    fs.readFileSync(priceFeedsFileName, "utf-8")
  ) as IPriceFeed[];

  const pythFeeds = (
    await hermesClient.getLatestPriceUpdates(
      Array.from(
        new Set(PROMOTED_PAIRS.map((p) => [p.feedXId, p.feedYId]).flat())
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
          previousPoints[key].totalPoints
        ).add(points);
        previousPoints[key].swapsAmount += 1;
      } else {
        previousPoints[key] = {
          totalPoints: points,
          points24HoursHistory: [],
          swapsAmount: 1,
        };
      }

      pointsChange[key] = new BN(pointsChange[key]).add(points);
    });

  Object.keys(previousPoints).forEach((key) => {
    if (previousPoints[key] && previousPoints[key].points24HoursHistory) {
      const prevHistory = previousPoints[key].points24HoursHistory;
      const recentHistory = prevHistory.filter((entry) =>
        new BN(entry.timestamp).gt(currentTimestamp.sub(DAY))
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

// createSnapshotForNetwork(Network.TEST).then(
//   () => {
//     console.log("Eclipse: Testnet snapshot done!");
//   },
//   (err) => {
//     console.log(err);
//   }
// );

createSnapshotForNetwork(Network.MAIN).then(
  () => {
    console.log("Eclipse: Mainnet swap snapshot done!");
  },
  (err) => {
    console.log(err);
  }
);
