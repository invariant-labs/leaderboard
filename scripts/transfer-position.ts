import { AnchorProvider } from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { IWallet, Market, Network } from "@invariant-labs/sdk-eclipse";
import { TransferPositionOwnership } from "@invariant-labs/sdk-eclipse/lib/market";
import { Keypair } from "@solana/web3.js";

require("dotenv").config();

const provider = AnchorProvider.local(
  "https://testnet.dev2.eclipsenetwork.xyz"
);
const connection = provider.connection;

const POSITION_OWNER = Keypair.fromSecretKey(
  bs58.decode(process.env.OWNER_PRIVATE_KEY as string)
);
const TARGET = Keypair.fromSecretKey(
  bs58.decode(process.env.TARGET_PRIVATE_KEY as string)
);

const main = async () => {
  const market = Market.build(
    Network.TEST,
    provider.wallet as IWallet,
    connection
  );
  const positions = await market.getAllUserPositionsWithIds(
    POSITION_OWNER.publicKey
  );
  console.log(positions[positions.length - 1][1]);

  const transferPositionOwnership: TransferPositionOwnership = {
    owner: POSITION_OWNER.publicKey,
    recipient: TARGET.publicKey,
    index: positions.length - 1,
  };
  await market.transferPositionOwnership(
    transferPositionOwnership,
    POSITION_OWNER
  );
};

main();
