import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { getTimestampInSeconds } from "../src/math";
import { PoolStructure } from "@invariant-labs/sdk-eclipse/lib/market";

require("dotenv").config();

const provider = AnchorProvider.local("https://eclipse.helius-rpc.com", {
  commitment: "confirmed",
});

const connection = provider.connection;

const POOL = new PublicKey("FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9");

const main = async () => {
  const market = Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );

  const latestTxHash = await getLatestTxHash(market.program.programId);

  const poolState: PoolStructure = await market.getPoolByAddress(POOL);
  const pair = new Pair(poolState.tokenX, poolState.tokenY, {
    fee: poolState.fee,
    tickSpacing: poolState.tickSpacing,
  });

  const [allPositions, allTicks, timestamp] = await Promise.all([
    market.getPositionsForPool(POOL),
    market.getAllTicks(pair),
    getTimestampInSeconds(),
  ]);

  const recentTxHash = await getLatestTxHash(market.program.programId);

  if (recentTxHash !== latestTxHash) {
    console.log("State inconsistency, please try again");
    return;
  }
  fs.mkdirSync(path.join(__dirname, `../pool_data/${POOL}`), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(__dirname, `../pool_data/${POOL}/pool.json`),
    JSON.stringify(poolState, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, `../pool_data/${POOL}/position.json`),
    JSON.stringify(allPositions, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, `../pool_data/${POOL}/ticks.json`),
    JSON.stringify(allTicks, null, 2)
  );
  fs.writeFileSync(
    path.join(__dirname, `../pool_data/${POOL}/timestamp.json`),
    JSON.stringify(timestamp, null, 2)
  );

  console.log("Transaction hash", recentTxHash);
};

const getLatestTxHash = async (programId: PublicKey) => {
  const [signature] = await connection.getSignaturesForAddress(
    programId,
    { limit: 1 },
    "confirmed"
  );
  return signature.signature;
};
main();
