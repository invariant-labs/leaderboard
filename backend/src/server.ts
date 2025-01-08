import app from "./app";
import { PORT } from "../src/config/index";

const main = async () => {
  try {
    await app.listen({ port: PORT });
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

main();
