import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const MAX_SIGNATURES_PER_CALL = 300;
export const PROMOTED_POOLS = [
  new PublicKey("7AdV5E8NznuVjNTT8rNm1MBGn8MNuFN9y9poQVSQ6gjD"),
]; // usdc/tts 1%
export const DAY = new BN(86400);
