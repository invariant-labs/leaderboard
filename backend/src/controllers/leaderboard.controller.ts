import { FastifyRequest, FastifyReply } from "fastify";

export const getLeaderboard = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  res.send({ success: true });
};
