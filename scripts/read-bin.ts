import path from "path";
import {
  PointsBinaryConverter,
  SwapPointsBinaryConverter,
} from "../src/conversion";
const main = () => {
  const file = path.join(__dirname, "../data/points_testnet.bin");
  // const file = path.join(__dirname, "../data/points_swap_testnet.bin");
  PointsBinaryConverter.writeBinaryFile(file, {});
  const data = PointsBinaryConverter.readBinaryFile(file);
  console.log(data);
};

main();
