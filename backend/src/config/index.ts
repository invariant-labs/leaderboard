export const CONFIG = {
  SERVER: {
    PORT: 3000,
    HOST: "localhost",
    NODE_ENV: process.env.NODE_ENV || "development",
  },
  DATABASE: {
    DATABASE_URL: "mongodb://localhost:27017/points",
  },
};

export default CONFIG;

export const { SERVER, DATABASE } = CONFIG;

export const { PORT, HOST } = CONFIG.SERVER;

export const { DATABASE_URL } = CONFIG.DATABASE;
