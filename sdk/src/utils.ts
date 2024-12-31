import {
  PoolStructure,
  Position,
} from "@invariant-labs/sdk-eclipse/lib/market";
import { priceToTick } from "@invariant-labs/sdk-eclipse/lib/math";
import BN from "bn.js";

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
  position.lowerTickIndex >= pool.currentTickIndex &&
  position.upperTickIndex < pool.currentTickIndex;

export const estimatePointsForPosition = (
  position: Position,
  pool: PoolStructure,
  pointsPerSecond: BN,
  compoundLiquidity: boolean = true,
  period: BN = ONE_DAY
) => {
  const points = pointsPerSecond.mul(period);

  if (compoundLiquidity) {
    const denominator = pool.liquidity.add(position.liquidity);
    return position.liquidity.mul(points).div(denominator);
  } else {
    return position.liquidity.mul(points).div(pool.liquidity);
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
