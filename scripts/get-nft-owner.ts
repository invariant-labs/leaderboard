import { AnchorProvider } from "@coral-xyz/anchor";
import { getAccount, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

require("dotenv").config();

const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");

const connection = provider.connection;
const PROGRAM_ID = TOKEN_2022_PROGRAM_ID;
const NFT_ADDRESS = new PublicKey(
  "JA5ZrG74FErSv8rHNUsirKysB26mboET6bGa43sPG4Ut"
);
const EXPECTED_OWNER = new PublicKey(
  "CnJtnBkDdsuaRTQR22gQwYbU1zmBMFrLeety4EL9BUN6"
);
const main = async () => {
  const [tokenAccount] = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        dataSize: 170,
      },
      {
        memcmp: {
          offset: 0,
          bytes: NFT_ADDRESS.toString(),
        },
      },
    ],
  });

  const accInfo = await getAccount(
    connection,
    tokenAccount.pubkey,
    undefined,
    PROGRAM_ID
  );

  console.log("Expected Owner:", EXPECTED_OWNER.toString());
  console.log("Received Owner:", accInfo.owner.toString());
};
main();
