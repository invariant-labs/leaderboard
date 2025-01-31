import * as fs from "fs";
import path from "path";
const main = () => {
  const contentPoints: Record<string, number>[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../data/contentpoints.json"), "utf-8")
  );
  const convertedObject: Record<string, number> = {};
  contentPoints.forEach((item) =>
    Object.entries(item).forEach(([key, val]) => {
      convertedObject[key] = val;
    })
  );
  fs.writeFileSync(
    path.join(__dirname, "../data/static.json"),
    JSON.stringify(convertedObject, null, 2)
  );
};
main();
