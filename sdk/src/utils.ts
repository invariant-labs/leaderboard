import { getX, getY, priceToTick } from "@invariant-labs/sdk-eclipse/lib/math";
import { BN } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import {
  parsePool,
  parsePosition,
  parseTick,
  PoolStructure,
  Position,
  PositionStructure,
  RawPosition,
  Tick,
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
import {
  calculateClaimAmount,
  calculateTokensOwed,
  DENOMINATOR,
  isActive,
} from "@invariant-labs/sdk-eclipse/lib/utils";

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
const EPSILON = 1 / 1e3;

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

export const getReservePubkeys = async (
  connection: Connection
): Promise<PublicKey[]> => {
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

  const addresses: PublicKey[] = [];

  const pools = (
    await market.program.account.pool.fetchMultiple(NUCLEUS_WHITELISTED_POOLS)
  ).map((p) => parsePool(p as any));

  for (const pool of pools) {
    const isTokenX = pool.tokenX.equals(TETH_PUBKEY);
    addresses.push(isTokenX ? pool.tokenXReserve : pool.tokenYReserve);
  }

  return addresses;
};

export const validateEffectiveBalance = async (
  connection: Connection,
  expectedBalance: number
): Promise<boolean> => {
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

  let effectiveBalance = 0;

  const poolFees: Record<string, number> = {};
  const inactiveBalances: Record<string, number> = {};

  for (const pool of NUCLEUS_WHITELISTED_POOLS) {
    const poolKey = pool.toBase58();

    const { poolState, allPositions, ticks } = await retryOperation(
      queryStatesAndTicks(connection, market, pool)
    );

    const isTokenX = poolState.tokenX.equals(TETH_PUBKEY);

    const tETHProtocolFee = isTokenX
      ? poolState.feeProtocolTokenX
      : poolState.feeProtocolTokenY;

    poolFees[poolKey] = tETHProtocolFee.toNumber() / TETH_DENOMINATOR;
    inactiveBalances[poolKey] = 0;

    for (const position of allPositions) {
      const tETH = calculateTETH(position, poolState);

      const lowerTick = ticks[position.lowerTickIndex];
      const upperTick = ticks[position.upperTickIndex];

      const [bnX, bnY] = calculateClaimAmount({
        position,
        tickLower: lowerTick,
        tickUpper: upperTick,
        tickCurrent: poolState.currentTickIndex,
        feeGrowthGlobalX: poolState.feeGrowthGlobalX,
        feeGrowthGlobalY: poolState.feeGrowthGlobalY,
      });

      const fee =
        (isTokenX ? bnX.toNumber() : bnY.toNumber()) / TETH_DENOMINATOR;

      poolFees[poolKey] += fee;

      if (
        !isActive(
          position.lowerTickIndex,
          position.upperTickIndex,
          poolState.currentTickIndex
        )
      ) {
        inactiveBalances[poolKey] += tETH.toNumber() / TETH_DENOMINATOR;
        continue;
      }

      effectiveBalance += tETH.toNumber() / TETH_DENOMINATOR;
    }
  }

  const sum =
    effectiveBalance +
    Object.values(poolFees).reduce((acc, fee) => acc + fee, 0) +
    Object.values(inactiveBalances).reduce((acc, fee) => acc + fee, 0);

  return expectedBalance - sum < EPSILON;
};

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
        !isActive(
          position.lowerTickIndex,
          position.upperTickIndex,
          poolState.currentTickIndex
        )
      ) {
        continue;
      }

      const tETH = calculateTETH(position, poolState);

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

const calculateTETH = (position: Position, pool: PoolStructure): BN => {
  const isTokenX = pool.tokenX.equals(TETH_PUBKEY);

  return isTokenX
    ? getX(
        position.liquidity,
        calculatePriceSqrt(position.upperTickIndex),
        pool.sqrtPrice,
        calculatePriceSqrt(position.lowerTickIndex)
      ) ?? new BN(0)
    : getY(
        position.liquidity,
        calculatePriceSqrt(position.upperTickIndex),
        pool.sqrtPrice,
        calculatePriceSqrt(position.lowerTickIndex)
      ) ?? new BN(0);
};

const queryStatesAndTicks = async (
  connection: Connection,
  market: Market,
  pool: PublicKey
): Promise<{
  allPositions: Position[];
  poolState: PoolStructure;
  ticks: Record<number, Tick>;
}> => {
  const lastSignature = await getLatestTxHash(pool, connection);

  const poolState = await market.getPoolByAddress(pool);

  const allPositions = (
    await market.program.account.position.all([
      {
        memcmp: { bytes: bs58.encode(pool.toBuffer()), offset: 40 },
      },
    ])
  ).map((p) => parsePosition(p.account));

  const pair = new Pair(poolState.tokenX, poolState.tokenY, {
    fee: poolState.fee,
    tickSpacing: poolState.tickSpacing,
  });

  const tickIndexes = Array.from(
    new Set(
      allPositions.map((p) => [p.lowerTickIndex, p.upperTickIndex]).flat()
    )
  );

  const tickAddresses = tickIndexes.map(
    (t: number) => market.getTickAddress(pair, t).tickAddress
  );

  const tickStates = (
    await market.program.account.tick.fetchMultiple(tickAddresses)
  ).map((t) => parseTick(t as any));

  const ticks = tickStates.reduce(
    (acc: Record<number, Tick>, tick: Tick, index: number) => {
      acc[tickIndexes[index]] = tick;
      return acc;
    },
    {}
  );

  const recentSig = await getLatestTxHash(pool, connection);

  if (lastSignature !== recentSig) {
    throw new Error("State inconsistency, please try again");
  }

  return {
    allPositions,
    poolState,
    ticks,
  };
};

const queryStates = async (
  connection: Connection,
  market: Market,
  pool: PublicKey,
  addresses: PublicKey[] = []
): Promise<{ allPositions: Position[]; poolState: PoolStructure }> => {
  const lastSignature = await getLatestTxHash(pool, connection);

  const poolState = await market.getPoolByAddress(pool);

  let allPositions: { publicKey: PublicKey; account: RawPosition }[] = [];

  if (addresses.length !== 0) {
    const promises = addresses.map((a: PublicKey) => {
      return market.program.account.position.all([
        { memcmp: { bytes: bs58.encode(a.toBuffer()), offset: 8 } },
        {
          memcmp: {
            bytes: bs58.encode(pool.toBuffer()),
            offset: 40,
          },
        },
      ]);
    });
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

  return {
    allPositions: allPositions.map((p) => parsePosition(p.account)),
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
