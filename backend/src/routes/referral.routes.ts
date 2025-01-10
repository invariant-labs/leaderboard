import {
  getCode,
  useCode,
  getReferralCodes,
  insertMockCodes,
} from "../controllers/referral.controller";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const leaderboardRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.get("/api/leaderboard/get-code/:address", getCode);
  fastify.post("/api/leaderboard/use-code", useCode);
  fastify.get("/api/leaderboard/get-referral-codes", getReferralCodes);
  fastify.post("/api/leaderboard/insert-mock-codes", insertMockCodes);
};

export default fp(leaderboardRoutes);
