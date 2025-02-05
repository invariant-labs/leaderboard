import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { FastifyInstance } from "fastify";
import { POINTS_UPDATE } from "../config";
import { clog } from "../services/utils";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  getMarketAddress,
  IWallet,
  Market,
  Network,
} from "@invariant-labs/sdk-eclipse";
import { ConfigCollection } from "../database/config";
import { processLiquidityPoints } from "../services/process-liquidity-points";
import { processSwapPoints } from "../services/process-swap-points";
import { LeaderboardCollection } from "../database/leaderboard";

const getConfigurationBasedOnNetwork = (network: Network) => {
  switch (network) {
    case Network.TEST:
      const providerTest = AnchorProvider.local(
        "https://testnet.dev2.eclipsenetwork.xyz"
      );
      return {
        connection: providerTest.connection,
        market: Market.build(
          network,
          providerTest.wallet as IWallet,
          providerTest.connection,
          new PublicKey(getMarketAddress(network))
        ),
        poolsHashes: {
          "4xLSZJwLdkQHGqgyx1E9KHvdMnj7QVKa9Pwcnp1x2mDc":
            "2Xmy5GYHMjeeQ3g34bcqo6HuS3c6NoeEjd8PkLFfNNGTkiESyfsApdAhfbRaU4JF68rgDU8QVutVzoYdecCaXw7m",
        },
        swapHashes: {},
      };
    default:
      const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
      return {
        connection: provider.connection,
        market: Market.build(
          network,
          provider.wallet as IWallet,
          provider.connection,
          new PublicKey(getMarketAddress(network))
        ),
        poolsHashes: {},
        swapHashes: {},
      };
  }
};
const handlePointsUpdate = (app: FastifyInstance) => async () => {
  clog("Handling points update");

  const { connection, market, poolsHashes, swapHashes } =
    getConfigurationBasedOnNetwork(Network.TEST);

  // const configCollection = new ConfigCollection();

  // const config = await configCollection.getConfig();

  // if (!config) {
  //   throw new Error("Config not found");
  // }

  try {
    const updatedPoolsHashes = await processLiquidityPoints(
      connection,
      market,
      // @ts-ignore
      poolsHashes
    );

    // await configCollection.setConfig({
    //   ...config,
    //   poolsHashes: updatedPoolsHashes,
    // });
  } catch (e) {
    console.error("Error processing liquidity points update", e);
  }

  // try {
  //   const updatedSwapHashes = await processSwapPoints(
  //     connection,
  //     market,
  //     swapHashes,
  //     []
  //   );
  //   await configCollection.setConfig({
  //     ...config,
  //     swapHashes: updatedSwapHashes,
  //   });
  // } catch (e) {
  //   console.error("Error processing swap points update", e);
  // }

  // try {
  //   const leaderboard = new LeaderboardCollection();
  //   await leaderboard.updateLeaderboard();
  //   const top100 = await leaderboard.getLeaderboard(1, 100);
  //   console.log("Top 100", top100);
  // } catch (e) {
  //   console.error("Error constructing leaderboard", e);
  // }

  clog("Points update done");
  return Promise.resolve();
};

const handlePointsUpdateError = (error: Error) => {
  console.error("points update job failed", error);
};

export const createPointsUpdateJob = (app: FastifyInstance) => {
  const task = new AsyncTask(
    POINTS_UPDATE.ID,
    handlePointsUpdate(app),
    handlePointsUpdateError
  );
  return new SimpleIntervalJob(
    {
      seconds: POINTS_UPDATE.INTERVAL,
      runImmediately: POINTS_UPDATE.RUN_IMMEDIATELY,
    },
    task
  );
};
