import rarible from "@api/rarible";
require("dotenv").config();

const ADDRESS = "3AE1okHV9UMweZ7h1dMNEsR9HVAURHxxN9N8c4vUZUxgHw";
const COLLECTION = "ECLIPSE:Ce4vXCcx8pRihFeyUfxbVYb93KiBpnKxZ94WioXc8SbX";

const main = async () => {
  rarible.auth(process.env.RARIBLE_API_KEY as string);
  const { data } = await rarible.getItemsByOwner({
    blockchains: ["ECLIPSE"],
    owner: `SOLANA%${ADDRESS}`,
  });

  const hasNFT = data.items.some((nft) => nft.collection === COLLECTION);
  console.log(hasNFT);
};

main();
