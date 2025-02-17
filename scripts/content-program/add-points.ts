import POINTS_TO_ADD from "./data.json";
import fs from "fs";
import path from "path";

const OUTPUT_FILE = path.join(__dirname, "../../data/static.json");

const main = async () => {
  const { startTimestamp, endTimestamp, data } = POINTS_TO_ADD;

  if (endTimestamp < startTimestamp) {
    throw new Error("End timestamp must be greater than start timestamp");
  }

  const outputData = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));

  for (const [key, value] of Object.entries(data)) {
    const entry = {
      startTimestamp,
      endTimestamp,
      points: value,
    };
    if (outputData[key]) {
      outputData[key].push(entry);
    } else {
      outputData[key] = [entry];
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
};

main();
