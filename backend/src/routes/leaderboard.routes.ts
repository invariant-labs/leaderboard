import {
  getCode,
  useCode,
  getReferralCodes,
} from "@controllers/leaderboard.controller";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const leaderboardRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.get("/api/leaderboard/get-code/:address", getCode);
  fastify.post("/api/leaderboard/use-code", useCode);
  fastify.get("/api/leaderboard/get-referral-codes", getReferralCodes);
};

export default fp(leaderboardRoutes);
