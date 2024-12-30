import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { IPromotedPool } from "./types";

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
    address: new PublicKey("FvVsbwsbGVo6PVfimkkPhpcRfBrRitiV946nMNNuz7f9"),
    pointsPerSecond: new BN(10),
    startCountTimestamp: new BN(1735587867),
  }, // ETH/tETH 0.01%
];

export const DAY = new BN(86400);
export const MAX_RETIRES = 3;
export const RETRY_DELAY = 800;
export const FULL_SNAP_START_TX_HASH_MAINNET =
  "zt4f4PYU2qKyvevjvED2Q9RSUJbiGSJns8NCQGAuLFgrTJ8irentnaEzc7uxxoi65vtmWxhwZh8HDg6NRsWjQxw";
export const FULL_SNAP_START_TX_HASH_TESTNET =
  "AmjrAbNvGU8qK6xFTGpPCFPcYruZvH7gZ46YtxFyMp58x9UK3MXJ3CC3UojBvptxiAjip7fU4txZtQMoJ6Sc6kf";
