import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import { Swap } from "@invariant-labs/sdk-eclipse/lib/market";
import { toDecimal } from "@invariant-labs/sdk-eclipse/lib/utils";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, Keypair } from "@solana/web3.js";
import BN from "bn.js";

require("dotenv").config();

const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

const POOL_AND_AMOUUNTS = [
  {
    pool: new PublicKey("GmCRe13oLWSz7pWmqsnLxTxF8zXapWTQSRjmfbJ654XZ"), // BTC/USDC 1%
    amount: new BN(100 * 10 ** 9),
    xToY: false,
  },
  {
    pool: new PublicKey("4ecDThVdiP6wHN2Tc6etpJt8hBtp573pgPb72vWodcVr"), // BTC/USDC 0.1%
    amount: new BN(1000 * 10 ** 9),
    xToY: false,
  },
];

const FOUNDER = Keypair.fromSecretKey(
  bs58.decode(process.env.FOUNDER_PRIVATE_KEY as string)
);
console.log("Swapper", FOUNDER.publicKey.toBase58());

const main = async () => {
  const market = await Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );

  for (const { pool, amount, xToY } of POOL_AND_AMOUUNTS) {
    const poolState = await market.getPoolByAddress(pool);

    const pair = new Pair(poolState.tokenX, poolState.tokenY, {
      fee: poolState.fee,
      tickSpacing: poolState.tickSpacing,
    });

    const userAccountX = getAssociatedTokenAddressSync(
      pair.tokenX,
      FOUNDER.publicKey
    );
    const userAccountY = getAssociatedTokenAddressSync(
      pair.tokenY,
      FOUNDER.publicKey
    );

    const swap: Swap = {
      pair,
      xToY,
      amount,
      estimatedPriceAfterSwap: poolState.sqrtPrice,
      slippage: toDecimal(5, 1),
      accountX: userAccountX,
      accountY: userAccountY,
      byAmountIn: true,
      owner: FOUNDER.publicKey,
    };

    await market.swap(swap, FOUNDER);
  }
};

main();
