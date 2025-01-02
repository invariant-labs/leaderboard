import { getLeaderboard } from "@controllers/leaderboard.controller";
import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const leaderboardRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.get("/api/leaderboard", getLeaderboard);
};

export default fp(leaderboardRoutes);
