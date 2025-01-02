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

const POOL = new PublicKey("4xLSZJwLdkQHGqgyx1E9KHvdMnj7QVKa9Pwcnp1x2mDc"); // USDC/TTS 0.05%
const FOUNDER = Keypair.fromSecretKey(
  bs58.decode(process.env.FOUNDER_PRIVATE_KEY as string)
);

const main = async () => {
  const market = await Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );

  const poolState = await market.getPoolByAddress(POOL);

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

  const amount = new BN(25000);
  const swap: Swap = {
    pair,
    // USDC is tokenX, TTS is tokenY
    xToY: true,
    amount,
    estimatedPriceAfterSwap: poolState.sqrtPrice,
    slippage: toDecimal(5, 1),
    accountX: userAccountX,
    accountY: userAccountY,
    byAmountIn: true,
    owner: FOUNDER.publicKey,
  };

  await market.swap(swap, FOUNDER);
};

main();
