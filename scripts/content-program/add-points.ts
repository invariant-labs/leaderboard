import POINTS_TO_ADD from "./datas5-part2.json";
import fs from "fs";
import path from "path";

const OUTPUT_FILE = path.join(__dirname, "../../data/content-program.json");

const main = async () => {
  const { startTimestamp, endTimestamp, data } = POINTS_TO_ADD;

  if (endTimestamp < startTimestamp) {
    throw new Error("End timestamp must be greater than start timestamp");
  }

  const outputData = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));

  for (let [key, value] of Object.entries(data)) {
    key = key.trim();
    const entry = {
      startTimestamp,
      endTimestamp,
      points: value,
    };
    if (outputData[key]) {
      const entries = outputData[key];
      entries.push(entry);
      entries.sort((a, b) => a.startTimestamp - b.startTimestamp);
      outputData[key] = entries;
    } else {
      outputData[key] = [entry];
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
};

main();
