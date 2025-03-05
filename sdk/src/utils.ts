import { priceToTick } from "@invariant-labs/sdk-eclipse/lib/math";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network } from "@invariant-labs/sdk-eclipse";
import {
  parsePosition,
  PoolStructure,
  Position,
} from "@invariant-labs/sdk-eclipse/lib/market";
import {
  calculatePriceSqrt,
  getDeltaX,
  getDeltaY,
} from "@invariant-labs/sdk-eclipse/lib/math";
import {
  PublicKey,
  Connection,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import fs from "fs";

const ONE_DAY = new BN(86400);

export const isPriceWithinPositionRange = (
  price: number,
  positionLowerTick: number,
  positionUpperTick: number
) => {
  const currentTick = priceToTick(price);
  return currentTick >= positionLowerTick && currentTick < positionUpperTick;
};

export const isPositionActive = (pool: PoolStructure, position: Position) =>
  position.lowerTickIndex <= pool.currentTickIndex &&
  position.upperTickIndex > pool.currentTickIndex;

export const estimatePointsForLiquidity = (
  liquidity: BN,
  pool: PoolStructure,
  pointsPerSecond: BN,
  compoundLiquidity: boolean = true,
  period: BN = ONE_DAY
) => {
  const points = pointsPerSecond.mul(period);

  if (compoundLiquidity) {
    const denominator = pool.liquidity.add(liquidity);
    return liquidity.mul(points).div(denominator);
  } else {
    return liquidity.mul(points).div(pool.liquidity);
  }
};

export const estimatePointsForUserPositions = (
  positions: Position[],
  pool: PoolStructure,
  pointsPerSecond: BN,
  compoundLiquidity: boolean = false,
  period: BN = ONE_DAY
) => {
  const liquidity = positions.reduce((acc, position) => {
    if (isPositionActive(pool, position)) {
      return acc.add(position.liquidity);
    } else {
      return acc;
    }
  }, new BN(0));

  const points = pointsPerSecond.mul(period);

  if (compoundLiquidity) {
    const denominator = pool.liquidity.add(liquidity);
    return liquidity.mul(points).div(denominator);
  } else {
    return liquidity.mul(points).div(pool.liquidity);
  }
};

export const getMessagePayload = (address: PublicKey, code: string) => {
  return address.toString() + " is using referral " + code;
};

const TETH_DECIMALS = 9;
const TETH_DENOMINATOR = 10 ** TETH_DECIMALS;
const MAX_RETRIES = 25;
const RETRY_DELAY = 2000;

export const NUCLEUS_WHITELISTED_POOLS: PublicKey[] = [
  new PublicKey("FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9"),
  new PublicKey("D323jpT4XmBFPshHvMRsf5nHmAMLa78q8ZBX7XXonYQq"),
];
const TETH_PUBKEY = new PublicKey(
  "GU7NS9xCwgNPiAdJ69iusFrRfawjDDPjeMBovhV1d4kn"
);

interface ResultEntry {
  address: string;
  effective_balance: number;
  vault_token_address: string;
}

export const getEffectiveTETHBalances = async (
  connection: Connection,
  addresses?: PublicKey[]
): Promise<ResultEntry[]> => {
  const market = Market.build(
    Network.MAIN,
    {
      async signTransaction<T extends Transaction | VersionedTransaction>(
        tx: T
      ): Promise<T> {
        return tx;
      },

      async signAllTransactions<T extends Transaction | VersionedTransaction>(
        txs: T[]
      ): Promise<T[]> {
        return txs;
      },

      publicKey: PublicKey.default,
    },
    connection
  );

  const userEntries: Record<
    string,
    Record<string, Omit<ResultEntry, "address">>
  > = {};

  for (const pool of NUCLEUS_WHITELISTED_POOLS) {
    const poolKey = pool.toBase58();
    if (!userEntries[poolKey]) {
      userEntries[poolKey] = {};
    }

    const { poolState, allPositions } = await retryOperation(
      queryStates(connection, market, pool, addresses)
    );

    const isTokenX = poolState.tokenX.equals(TETH_PUBKEY);

    for (const position of allPositions) {
      if (
        position.lowerTickIndex > poolState.currentTickIndex ||
        position.upperTickIndex <= poolState.currentTickIndex
      ) {
        continue;
      }

      const tETH = isTokenX
        ? getDeltaX(
            poolState.sqrtPrice,
            calculatePriceSqrt(position.upperTickIndex),
            position.liquidity,
            false
          ) ?? new BN(0)
        : getDeltaY(
            calculatePriceSqrt(position.lowerTickIndex),
            poolState.sqrtPrice,
            position.liquidity,
            false
          ) ?? new BN(0);

      const ownerKey = position.owner.toBase58();

      if (userEntries[poolKey][ownerKey]) {
        userEntries[poolKey][ownerKey].effective_balance +=
          tETH.toNumber() / TETH_DENOMINATOR;
      } else {
        userEntries[poolKey][ownerKey] = {
          effective_balance: tETH.toNumber() / TETH_DENOMINATOR,
          vault_token_address: isTokenX
            ? poolState.tokenXReserve.toBase58()
            : poolState.tokenYReserve.toBase58(),
        };
      }
    }
  }

  const data: ResultEntry[] = [];

  for (const values of Object.values(userEntries)) {
    for (const [key, value] of Object.entries(values)) {
      data.push({ ...value, address: key });
    }
  }

  return data;
};

const queryStates = async (
  connection: Connection,
  market: Market,
  pool: PublicKey,
  addresses: PublicKey[] = []
): Promise<{ allPositions: Position[]; poolState: PoolStructure }> => {
  const lastSignature = await getLatestTxHash(pool, connection);

  const poolState = await market.getPoolByAddress(pool);

  let allPositions: any[] = [];

  if (addresses.length !== 0) {
    const promises = addresses.map((a: PublicKey) =>
      market.program.account.position.all([
        { memcmp: { bytes: bs58.encode(a.toBuffer()), offset: 8 } },
      ])
    );
    allPositions = (await Promise.all(promises)).flat();
  } else {
    allPositions = await market.program.account.position.all([
      {
        memcmp: { bytes: bs58.encode(pool.toBuffer()), offset: 40 },
      },
    ]);
  }

  const recentSig = await getLatestTxHash(pool, connection);

  if (lastSignature !== recentSig) {
    throw new Error("State inconsistency, please try again");
  }

  const parsedPositions =
    addresses.length === 0
      ? allPositions.map((p) => parsePosition(p.account))
      : allPositions
          .map((p) => parsePosition(p.account))
          .filter((p) => p.pool.equals(pool));

  return {
    allPositions: parsedPositions,
    poolState,
  };
};

const retryOperation = async (
  fn: Promise<any>,
  retires: number = 0
): Promise<any> => {
  try {
    return await fn;
  } catch (error) {
    if (retires < MAX_RETRIES) {
      await delay(RETRY_DELAY);
      return retryOperation(fn, retires + 1);
    } else {
      throw new Error("Failed to retry operation" + error);
    }
  }
};

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getLatestTxHash = async (
  programId: PublicKey,
  connection: Connection
) => {
  const [signature] = await connection.getSignaturesForAddress(
    programId,
    { limit: 1 },
    "confirmed"
  );
  return signature.signature;
};
