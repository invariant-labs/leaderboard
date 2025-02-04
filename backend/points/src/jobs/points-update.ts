import { AsyncTask, SimpleIntervalJob } from "toad-scheduler";
import { FastifyInstance } from "fastify";
import { POINTS_UPDATE, NETWORK, RPC_URL } from "../config";
import { clog } from "../services/utils";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getMarketAddress, IWallet, Market } from "@invariant-labs/sdk-eclipse";
import { ConfigCollection } from "../database/config";
import { processLiquidityPoints } from "../services/process-liquidity-points";
import { processSwapPoints } from "../services/process-swap-points";

const handlePointsUpdate = (app: FastifyInstance) => async () => {
  clog("Handling points update");
  const provider = AnchorProvider.local(RPC_URL);
  const connection = provider.connection;
  const programId = new PublicKey(getMarketAddress(NETWORK));
  const market = Market.build(
    NETWORK,
    provider.wallet as IWallet,
    connection,
    programId
  );

  const configCollection = new ConfigCollection();

  const config = await configCollection.getConfig();

  if (!config) {
    throw new Error("Config not found");
  }

  // try {
  //   const updatedPoolsHashes = await processLiquidityPoints(
  //     connection,
  //     market,
  //     config.poolsHashes
  //   );
  //   await configCollection.setConfig({
  //     ...config,
  //     poolsHashes: updatedPoolsHashes,
  //   });
  // } catch (e) {
  //   console.error("Error processing liquidity points update", e);
  // }

  // try {
  //   const updatedSwapHashes = await processSwapPoints(
  //     connection,
  //     market,
  //     config.swapHashes,
  //     []
  //   );
  //   await configCollection.setConfig({
  //     ...config,
  //     swapHashes: updatedSwapHashes,
  //   });
  // } catch (e) {
  //   console.error("Error processing swap points update", e);
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
