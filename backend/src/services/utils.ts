import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

export const getRandomCode = (): string => {
  const code = Math.random().toString(36).substring(2, 10);
  return code;
};

export const verifyMessage = (
  signature: Uint8Array,
  message: Uint8Array,
  address: PublicKey
) => nacl.sign.detached.verify(message, signature, address.toBytes());
