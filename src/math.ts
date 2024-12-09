import BN from "bn.js";

const MAX_U128 = new BN("340282366920938463463374607431768211455");
const SECONDS_PER_LIQUIDITY_DECIMAL = 24;
const LIQUIDITY_DECIMAL = 6;
const LIQUIDITY_DENOMINATOR = new BN(10).pow(new BN(LIQUIDITY_DECIMAL));
const SECONDS_PER_LIQUIDITY_DENOMINATOR = new BN(10).pow(
  new BN(SECONDS_PER_LIQUIDITY_DECIMAL)
);

export const POINTS_PER_SECOND = new BN(10000);

export const calculateReward = (
  liquidity: BN,
  secondsPerLiquidityInsideInitial: BN,
  secondsPerLiquidityInside: BN,
  pointsToDistribute: BN,
  totalSecondsPerLiquidity: BN
): BN => {
  if (totalSecondsPerLiquidity.eqn(0)) {
    return new BN(0);
  }

  const secondsInside = wrappingSub(
    secondsPerLiquidityInside,
    secondsPerLiquidityInsideInitial
  )
    .mul(liquidity)
    .div(SECONDS_PER_LIQUIDITY_DENOMINATOR)
    .div(LIQUIDITY_DENOMINATOR);

  const points = pointsToDistribute
    .mul(secondsInside)
    .div(totalSecondsPerLiquidity);

  return points;
};

export const calculatePointsToDistribute = (
  lastSnapTimestamp: BN,
  currentTimestamp: BN
) => {
  return POINTS_PER_SECOND.mul(currentTimestamp.sub(lastSnapTimestamp));
};

export const calculateSecondsPerLiquidityGlobal = (
  currentSecondsPerLiquidityGlobal: BN,
  liquidity: BN,
  lastTimestamp: BN,
  now: BN
): BN => {
  const deltaTime = now
    .sub(lastTimestamp)
    .mul(SECONDS_PER_LIQUIDITY_DENOMINATOR);
  const newSecondsPerLiquidityGlobal = wrappingAdd(
    currentSecondsPerLiquidityGlobal,
    deltaTime.div(liquidity)
  );
  return newSecondsPerLiquidityGlobal;
};

export const calculateSecondsPerLiquidityInside = (
  upperTick: BN,
  lowerTick: BN,
  currentTick: BN,
  upperTickSecondsPerLiquidityOutside: BN,
  lowerTickSecondsPerLiquidityOutside: BN,
  poolSecondsPerLiquidityGlobal: BN
): BN => {
  const currentAboveLower = currentTick.gte(lowerTick);
  const currentBelowUpper = currentTick.lt(upperTick);

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

const getTimestampInSeconds = (): BN => {
  return new BN(Math.floor(Date.now() / 1000));
};

const wrappingSub = (a: BN, b: BN): BN => {
  if (b.gt(a)) {
    return MAX_U128.sub(b.sub(a)).add(1);
  } else {
    return a.sub(b);
  }
};

const wrappingAdd = (a: BN, b: BN): BN => {
  if (b.gt(MAX_U128.sub(a))) {
    return b.sub(MAX_U128.sub(a)).sub(1);
  } else {
    return a.add(b);
  }
};
