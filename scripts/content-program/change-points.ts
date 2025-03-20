import POINTS_TO_CHANGE from "./to-change.json";
import fs from "fs";
import path from "path";

const OUTPUT_FILE = path.join(__dirname, "../../data/content-program.json");

const main = async () => {
  const { startTimestamp, endTimestamp, data } = POINTS_TO_CHANGE;

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

    const existingEntries = outputData[key] || [];
    const filtered = existingEntries.filter(
      (e) =>
        e.startTimestamp !== startTimestamp && e.endTimestamp !== endTimestamp
    );

    outputData[key] = [...filtered, entry];
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
};

main();
