import fs from "fs";
import path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

const NEW_STATIC_POINTS_FILENAME = "autoswapcontet.json";
const STATIC_POINTS_FILENAME = "static.json";
const addStaticPoints = async () => {
  const staticData: Record<string, number> = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `../data/${STATIC_POINTS_FILENAME}`),
      "utf-8"
    )
  );
  const newStaticData: Record<string, number> = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, `../data/${NEW_STATIC_POINTS_FILENAME}`),
      "utf-8"
    )
  );
  Object.entries(newStaticData).forEach(([key, val]) => {
    const previousValue = staticData[key];
    if (previousValue) {
      staticData[key] = previousValue + val;
    } else {
      staticData[key] = val;
    }
  });
  fs.writeFileSync(
    path.join(__dirname, `../data/${STATIC_POINTS_FILENAME}`),
    JSON.stringify(staticData, null, 2)
  );
};
addStaticPoints();
