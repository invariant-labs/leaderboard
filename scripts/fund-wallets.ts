import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import { PublicKey, Keypair } from "@solana/web3.js";
import fs from "fs";
require("dotenv").config();

const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

const USDC_MINT = new PublicKey("5gFSyxjNsuQsZKn9g5L9Ky3cSUvJ6YXqWVuPzmSi8Trx");
const TTS_MINT = new PublicKey("Ejz1eazd4Nrfy2o2kBSW2a3exk2CT7j2z6yR4QSTCd7i");
const USDC_AMOUNT = 1e9 * 1.2; // 1.2 USDC
const TTS_AMOUNT = 1e5 * 1.2; // 1.2 TTS

const FOUNDER = Keypair.fromSecretKey(
  bs58.decode(process.env.FOUNDER_PRIVATE_KEY as string)
);
const FOUNDER_USDC_ATA = getAssociatedTokenAddressSync(
  USDC_MINT,
  FOUNDER.publicKey
);
const FOUNDER_TTS_ATA = getAssociatedTokenAddressSync(
  TTS_MINT,
  FOUNDER.publicKey
);

const main = async () => {
  const wallets = JSON.parse(
    fs.readFileSync("./scripts/wallets.json", "utf-8")
  );
  const walletKeys = wallets.map((w) =>
    Keypair.fromSecretKey(new Uint8Array(w))
  );

  for (const [index, wallet] of walletKeys.entries()) {
    console.log(`Funding wallet ${index + 1}`);
    console.log(wallet.publicKey.toBase58());
    const usdcAta = await getOrCreateAssociatedTokenAccount(
      connection,
      FOUNDER,
      USDC_MINT,
      wallet.publicKey
    );
    const ttsAta = await getOrCreateAssociatedTokenAccount(
      connection,
      FOUNDER,
      TTS_MINT,
      wallet.publicKey
    );

    await transfer(
      connection,
      FOUNDER,
      FOUNDER_USDC_ATA,
      usdcAta.address,
      FOUNDER,
      USDC_AMOUNT
    );
    await transfer(
      connection,
      FOUNDER,
      FOUNDER_TTS_ATA,
      ttsAta.address,
      FOUNDER,
      TTS_AMOUNT
    );
  }
};

main();
