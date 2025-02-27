import { BN } from "@coral-xyz/anchor";
import path from "path";

const main = () => {
  const finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
  const finalData = require(finalDataFile);
  const finalLp = require(path.join(
    __dirname,
    "../data/final_data_lp_mainnet.json"
  ));
  const finalSwap = require(path.join(
    __dirname,
    "../data/final_data_swap_mainnet.json"
  ));

  console.log("TOTAL");
  for (const entry of finalData.slice(0, 10)) {
    console.log(
      entry.address,
      new BN(entry.points, "hex").div(new BN(1e8)).toNumber()
    );
  }

  console.log("LP");
  for (const entry of finalLp.slice(0, 10)) {
    console.log(
      entry.address,
      new BN(entry.points, "hex").div(new BN(1e8)).toNumber()
    );
  }
  console.log("SWAP");
  for (const entry of finalSwap.slice(0, 10)) {
    console.log(
      entry.address,
      new BN(entry.points, "hex").div(new BN(1e8)).toNumber()
    );
  }
};

main();
