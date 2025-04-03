import fs from "fs";
import path from "path";

const CONTENT_PROGRAM_FILE = path.join(
  __dirname,
  "../../data/content-program.json"
);
const FINAL_DATA_MAINNET = path.join(
  __dirname,
  "../../data/final_data_mainnet.json"
);

const main = async () => {
  const cpData = JSON.parse(fs.readFileSync(CONTENT_PROGRAM_FILE, "utf-8"));
  const finalData = JSON.parse(fs.readFileSync(FINAL_DATA_MAINNET, "utf-8"));

  for (const [key, value] of Object.entries(cpData)) {
    const trimmedKey = key.trim();
    if (key !== trimmedKey) {
      console.log(key);
      const correctValue = cpData[trimmedKey];
      if (correctValue) {
        const associatedEntry = correctValue.find(
          (entry: any) =>
            entry.startTimestamp === (value as any)[0].startTimestamp &&
            entry.endTimestamp === (value as any)[0].endTimestamp
        );
        console.log(associatedEntry);
        if (associatedEntry) {
          associatedEntry.points += (value as any)[0].points;
        } else {
          cpData[trimmedKey] = [...correctValue, ...(value as any)];
        }
      } else {
        cpData[trimmedKey] = value;
      }

      delete cpData[key];
      delete finalData[key];
    }
  }

  fs.writeFileSync(CONTENT_PROGRAM_FILE, JSON.stringify(cpData));
  fs.writeFileSync(FINAL_DATA_MAINNET, JSON.stringify(finalData));
};

main();
