import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network, Pair } from "@invariant-labs/sdk-eclipse";
import { PublicKey, Keypair } from "@solana/web3.js";

require("dotenv").config();

// const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

// const POOL = new PublicKey("G8Skt6kgqVL9ocYn4aYVGs3gUg8EfQrTJAkA2qt3gcs8"); // USDC/ETH 0.01%
const POOL = new PublicKey("4xLSZJwLdkQHGqgyx1E9KHvdMnj7QVKa9Pwcnp1x2mDc"); // USDC/ETH 0.01%
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

  const { head } = await market.getPositionList(FOUNDER.publicKey);
  const allPositions = await market.getPositionsFromRange(
    FOUNDER.publicKey,
    0,
    head
  );
  console.log("Total positions", allPositions.length);
  console.log(allPositions);
  console.log(poolState);
};
main();
