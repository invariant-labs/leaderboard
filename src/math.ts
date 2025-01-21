import { BN } from "@coral-xyz/anchor";
import { MAX_CONFIDENCE_PERCENTAGE, POINTS_PER_USD } from "./consts";

const MAX_U128 = new BN("340282366920938463463374607431768211455");
const SECONDS_PER_LIQUIDITY_DECIMAL = 24;
const LIQUIDITY_DECIMAL = 6;
export const POINTS_DECIMAL = 8;
const SECONDS_INSIDE_DECIMAL = 2;
const PERCENTAGE_DECIMAL = 6;
const PERCENTAGE_DENOMINATOR = new BN(10).pow(new BN(PERCENTAGE_DECIMAL));
const LIQUIDITY_DENOMINATOR = new BN(10).pow(new BN(LIQUIDITY_DECIMAL));
const SECONDS_PER_LIQUIDITY_DENOMINATOR = new BN(10).pow(
  new BN(SECONDS_PER_LIQUIDITY_DECIMAL)
);
export const POINTS_DENOMINATOR = new BN(10).pow(new BN(POINTS_DECIMAL));
const SECONDS_INSIDE_DENOMINATOR = new BN(10).pow(
  new BN(SECONDS_INSIDE_DECIMAL)
);

export const calculateReward = (
  liquidity: BN,
  secondsPerLiquidityInsideInitial: BN,
  secondsPerLiquidityInside: BN,
  pointsToDistribute: BN,
  totalSecondsPassed: BN
): BN => {
  const secondsInside = calculateSecondsInside(
    liquidity,
    secondsPerLiquidityInsideInitial,
    secondsPerLiquidityInside
  );

  const points = pointsToDistribute
    .mul(secondsInside)
    .mul(POINTS_DENOMINATOR)
    .div(totalSecondsPassed)
    .div(SECONDS_INSIDE_DENOMINATOR);

  return points;
};

export const calculateSecondsInside = (
  liquidity: BN,
  secondsPerLiquidityInsideInitial: BN,
  secondsPerLiquidityInside: BN
): BN => {
  return wrappingSub(
    secondsPerLiquidityInside,
    secondsPerLiquidityInsideInitial
  )
    .mul(liquidity)
    .mul(SECONDS_INSIDE_DENOMINATOR)
    .div(LIQUIDITY_DENOMINATOR)
    .div(SECONDS_PER_LIQUIDITY_DENOMINATOR);
};

export const calculatePointsToDistribute = (
  lastSnapTimestamp: BN,
  currentTimestamp: BN,
  pointsPerSecond: BN
) => {
  return pointsPerSecond.mul(currentTimestamp.sub(lastSnapTimestamp));
};

export const calculateSecondsPerLiquidityGlobal = (
  currentSecondsPerLiquidityGlobal: BN,
  liquidity: BN,
  lastTimestamp: BN,
  now: BN
): BN => {
  const deltaTime = now
    .sub(lastTimestamp)
    .mul(SECONDS_PER_LIQUIDITY_DENOMINATOR)
    .mul(LIQUIDITY_DENOMINATOR);

  if (liquidity.eqn(0)) {
    return currentSecondsPerLiquidityGlobal;
  }

  const newSecondsPerLiquidityGlobal = wrappingAdd(
    currentSecondsPerLiquidityGlobal,
    deltaTime.div(liquidity)
  );
  return newSecondsPerLiquidityGlobal;
};

export const calculateSecondsPerLiquidityInside = (
  upperTick: number,
  lowerTick: number,
  currentTick: number,
  upperTickSecondsPerLiquidityOutside: BN,
  lowerTickSecondsPerLiquidityOutside: BN,
  poolSecondsPerLiquidityGlobal: BN
): BN => {
  const currentAboveLower = currentTick >= lowerTick;
  const currentBelowUpper = currentTick < upperTick;

  let secondsPerLiquidityBelow, secondsPerLiquidityAbove;

  if (currentAboveLower) {
    secondsPerLiquidityBelow = lowerTickSecondsPerLiquidityOutside;
  } else {
    secondsPerLiquidityBelow = wrappingSub(
      poolSecondsPerLiquidityGlobal,
      lowerTickSecondsPerLiquidityOutside
    );
  }

  if (currentBelowUpper) {
    secondsPerLiquidityAbove = upperTickSecondsPerLiquidityOutside;
  } else {
    secondsPerLiquidityAbove = wrappingSub(
      poolSecondsPerLiquidityGlobal,
      upperTickSecondsPerLiquidityOutside
    );
  }

  return wrappingSub(
    wrappingSub(poolSecondsPerLiquidityGlobal, secondsPerLiquidityBelow),
    secondsPerLiquidityAbove
  );
};

export const calculatePointsForSwap = (
  fee: BN,
  decimals: number,
  priceFeed: BN,
  priceDecimals: number
) => {
  const nominator = fee
    .mul(priceFeed)
    .mul(POINTS_PER_USD)
    .mul(POINTS_DENOMINATOR);

  const denominator = new BN(10).pow(new BN(decimals + priceDecimals));

  return nominator.div(denominator);
};

export const isConfidenceAcceptable = (price: BN, confidence: BN) => {
  const limit = price
    .mul(MAX_CONFIDENCE_PERCENTAGE)
    .div(PERCENTAGE_DENOMINATOR);

  return confidence.lte(limit);
};

export const getTimestampInSeconds = (): BN => {
  return new BN(Math.floor(Date.now() / 1000));
};

const wrappingSub = (a: BN, b: BN): BN => {
  if (b.gt(a)) {
    return MAX_U128.sub(b.sub(a)).add(new BN(1));
  } else {
    return a.sub(b);
  }
};

const wrappingAdd = (a: BN, b: BN): BN => {
  if (b.gt(MAX_U128.sub(a))) {
    return b.sub(MAX_U128.sub(a)).sub(new BN(1));
  } else {
    return a.add(b);
  }
};
