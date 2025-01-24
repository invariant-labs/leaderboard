import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IPromotedPair, IPromotedPool } from "./types";

export const MAX_SIGNATURES_PER_CALL = 100;
export const PROMOTED_POOLS_TESTNET: IPromotedPool[] = [
  // new PublicKey("7AdV5E8NznuVjNTT8rNm1MBGn8MNuFN9y9poQVSQ6gjD"), // usdc/tts 1%
  //new PublicKey("4xLSZJwLdkQHGqgyx1E9KHvdMnj7QVKa9Pwcnp1x2mDc"), // USDC/TTS 0.05%
  // {
  //   address: new PublicKey("GTVKQs8o9D52y9SdwfAXCQSDrrCLosvsP19HgHKugpfw"),
  //   pointsPerSecond: new BN(100),
  // }, // USDC/V2 0.01%
  {
    address: new PublicKey("G28wnbasJuXihJ76KgFxynsA8WCj4yJZujq9ZhTbBLQm"),
    pointsPerSecond: new BN(100),
    startCountTimestamp: new BN(0),
  }, // USDC/TTS 0.01%
  {
    address: new PublicKey("3YnSG9bS5tp7Bp8QZK6xZKKmfrNJJK8TE8UyZq99nhxH"),
    pointsPerSecond: new BN(100),
    startCountTimestamp: new BN(0),
  }, // USDC/V2 0.02%
];
export const PROMOTED_POOLS_MAINNET: IPromotedPool[] = [
  {
    address: new PublicKey("HRgVv1pyBLXdsAddq4ubSqo8xdQWRrYbvmXqEDtectce"),
    pointsPerSecond: new BN(100),
    startCountTimestamp: new BN(1734793434),
  }, // ETH/USDC 0.09%
  {
    address: new PublicKey("86vPh8ctgeQnnn8qPADy5BkzrqoH5XjMCWvkd4tYhhmM"),
    pointsPerSecond: new BN(35),
    startCountTimestamp: new BN(1737041362),
  }, // SOL/ETH 0.09%
  {
    address: new PublicKey("FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9"),
    pointsPerSecond: new BN(10),
    startCountTimestamp: new BN(1735587867),
  }, // ETH/tETH 0.01%
];

export const DOMAIN_LIMIT = 1000;
export const DAY = new BN(86400);
export const MAX_RETIRES = 3;
export const MAX_RETRIES_FOR_STATE_INCONSISTENCY = 15;
export const RETRY_DELAY = 800;
export const FULL_SNAP_START_TX_HASH_MAINNET =
  "zt4f4PYU2qKyvevjvED2Q9RSUJbiGSJns8NCQGAuLFgrTJ8irentnaEzc7uxxoi65vtmWxhwZh8HDg6NRsWjQxw";
export const FULL_SNAP_START_TX_HASH_TESTNET =
  "AmjrAbNvGU8qK6xFTGpPCFPcYruZvH7gZ46YtxFyMp58x9UK3MXJ3CC3UojBvptxiAjip7fU4txZtQMoJ6Sc6kf";

// SWAPS
export const SWAP_MULTIPLIER = new BN(5);
export const POINTS_PER_USD = new BN(200).mul(SWAP_MULTIPLIER);
export const MAX_CONFIDENCE_PERCENTAGE = new BN(25000); // 2.5%
// Price feed IDS: https://www.pyth.network/developers/price-feed-ids
export const PROMOTED_PAIRS_MAINNET: IPromotedPair[] = [
  {
    tokenX: new PublicKey("AKEWE7Bgh87GPp171b4cJPSSZfmZwQ3KaqYqXoKLNAEE"),
    xDecimal: 6,
    feedXId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", //  USDC/USD
    tokenY: new PublicKey("So11111111111111111111111111111111111111112"),
    yDecimal: 9,
    feedYId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
    startTxHash:
      "4xcjRGt25MFL3ffDTBeazQ7LSzp3HFrNLAnabnXAJxCcmWFdCwSJMTTrtCYZuTvearrHX3EsmVvA7Grqa9fU5vcT",
  },
  {
    tokenX: new PublicKey("GU7NS9xCwgNPiAdJ69iusFrRfawjDDPjeMBovhV1d4kn"),
    xDecimal: 9,
    feedXId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", //  ETH/USD because there is no tETH/USD
    tokenY: new PublicKey("So11111111111111111111111111111111111111112"),
    yDecimal: 9,
    feedYId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
    startTxHash:
      "4X2aLE6gbWZwgDjnY69g9N7Hsfbw9BvqAtHninQRdir553z99HaQfdL6McVAzkwYTbbnAQMWpnLf36gQFuJmWgMX",
  },
  {
    tokenX: new PublicKey("BeRUj3h7BqkbdfFU7FBNYbodgf8GCHodzKvF9aVjNNfL"),
    xDecimal: 9,
    feedXId:
      "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", //  SOL/USD
    tokenY: new PublicKey("So11111111111111111111111111111111111111112"),
    yDecimal: 9,
    feedYId:
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
    startTxHash:
      "4X2aLE6gbWZwgDjnY69g9N7Hsfbw9BvqAtHninQRdir553z99HaQfdL6McVAzkwYTbbnAQMWpnLf36gQFuJmWgMX",
  },
];

export const PROMOTED_PAIRS_TESTNET: IPromotedPair[] = [
  {
    tokenX: new PublicKey("2F5TprcNBqj2hXVr9oTssabKdf8Zbsf9xStqWjPm8yLo"),
    xDecimal: 9,
    feedXId:
      "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", //  BTC/USD
    tokenY: new PublicKey("5gFSyxjNsuQsZKn9g5L9Ky3cSUvJ6YXqWVuPzmSi8Trx"),
    yDecimal: 9,
    feedYId:
      "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", // USDC/USD
    startTxHash:
      "5zYeULhNMbzQi1Fzr8QuhogFPZgX2G4hzB3neVqnNx7BaxERSN6wreJ6GvV46m6soijnvgD3wxDv1hFkHS9RiMzn",
  },
];
