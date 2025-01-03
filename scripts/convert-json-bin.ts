import path from "path";
import { PointsBinaryConverter } from "../src/conversion";
import { IPointsJson } from "../src/types";
import { BN } from "@coral-xyz/anchor";

async function main() {
  try {
    const originalFile = path.join(__dirname, "../data/points_mainnet.json");
    const binaryFile = path.join(__dirname, "../data/points_mainnet.bin");
    const restoredFile = path.join(
      __dirname,
      "../data/restored_points_mainnet.json"
    );

    console.log("Converting JSON to binary...");
    let start = Date.now();
    PointsBinaryConverter.convertFileToBinary(originalFile, binaryFile);
    let end = Date.now();
    console.log("Conversion from JSON to Binary took", end - start, "ms");

    // Convert back to JSON to verify
    console.log("\nConverting binary back to JSON...");
    start = Date.now();
    const restoredJson = PointsBinaryConverter.readBinaryFile(binaryFile);
    end = Date.now();
    console.log("Conversion from Binary to JSON took", end - start, "ms");

    console.log("\nConversion completed successfully!");

    PointsBinaryConverter.convertBinaryToFile(binaryFile, restoredFile);

    const originalJson = await import(originalFile);
    Object.entries(originalJson).forEach(([key, value]) => {
      if (key === "default") {
        return;
      }

      const restoredData = restoredJson[key];

      if (!restoredData) {
        throw new Error("Restored data is missing points for address: " + key);
      }

      const { points24HoursHistory, positionsAmount, totalPoints } =
        value as IPointsJson;

      if (
        !new BN(restoredData.totalPoints, "hex").eq(new BN(totalPoints, "hex"))
      ) {
        throw new Error(
          "Total points mismatch for address: " +
            key +
            "Original: " +
            totalPoints +
            "Restored: " +
            restoredData.totalPoints
        );
      }

      if (restoredData.positionsAmount !== positionsAmount) {
        throw new Error(
          "Positions amount mismatch for address: " +
            key +
            "Original: " +
            positionsAmount +
            "Restored: " +
            restoredData.positionsAmount
        );
      }

      try {
        if (!restoredData.points24HoursHistory.length) {
          console.log(restoredData);
        }
      } catch (e) {
        console.log(Object.values(restoredData));
      }

      if (
        restoredData.points24HoursHistory.length !== points24HoursHistory.length
      ) {
        throw new Error(
          "Points 24 hours history length mismatch for address: " +
            key +
            "Original: " +
            points24HoursHistory.length +
            "Restored: " +
            restoredData.points24HoursHistory.length
        );
      }

      const last24hChange = points24HoursHistory.reduce((acc, curr) => {
        return acc.add(new BN(curr.diff, "hex"));
      }, new BN(0));

      const restoredLast24hChange = restoredData.points24HoursHistory.reduce(
        (acc, curr) => {
          return acc.add(new BN(curr.diff, "hex"));
        },
        new BN(0)
      );

      if (!last24hChange.eq(restoredLast24hChange)) {
        throw new Error(
          "Last 24 hours points mismatch for address: " +
            key +
            "Original: " +
            last24hChange +
            "Restored: " +
            restoredLast24hChange
        );
      }
    });

    console.log("All data verified successfully!");
  } catch (error) {
    console.error("Conversion failed:", error);
  }
}

main();
