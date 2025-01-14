import path from "path";
import { SwapPointsBinaryConverter } from "../src/conversion";
const main = () => {
  const file = path.join(__dirname, "../data/points_swap_testnet.bin");

  const data = SwapPointsBinaryConverter.readBinaryFile(file);
  console.log(data);
};

main();
