import { Collections, IReferralCollectionItem } from "@/models/collections";
import {
  getRandomCode,
  LeaderboardCollection,
} from "@services/leaderboard.service";
import { FastifyRequest, FastifyReply } from "fastify";

interface IUseCodeBody {
  address: string;
  code: string;
  // TODO: Remove null later
  message: string | null;
  signature: string | null;
}
interface IGetCodeParams {
  address: string;
}

export const getReferralCodes = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const collection = new LeaderboardCollection(Collections.Referrals);
  const referrals = await collection.getAllElementsAsArray();
  res.send(referrals);
};

export const useCode = async (
  req: FastifyRequest<{ Body: IUseCodeBody }>,
  res: FastifyReply
) => {
  const collection = new LeaderboardCollection(Collections.Referrals);
  const { address, code, message, signature } = req.body;
  const referrerEntry = await collection.findOne({
    code,
  });

  if (!referrerEntry) {
    return res.status(400).send({ ok: false });
  }

  await collection.updateOne(
    { code },
    { invited: [...referrerEntry.invited, address] }
  );
  const userEntry = await collection.findOne({ address });

  if (userEntry) {
    await collection.updateOne({ address }, { address, codeUsed: code });
    return res.status(200).send({ ok: true });
  }
  const codeOwned = getRandomCode();
  const newUserEntry: IReferralCollectionItem = {
    address,
    code: codeOwned,
    codeUsed: code,
    message,
    signature,
    invited: [],
  };
  await collection.insertOne(newUserEntry);
  return res.status(200).send({ ok: true });
};

export const getCode = async (
  req: FastifyRequest<{ Params: IGetCodeParams }>,
  res: FastifyReply
) => {
  const collection = new LeaderboardCollection(Collections.Referrals);
  const { address } = req.params;
  const userEntry = await collection.findOne({ address });
  if (userEntry) {
    return res.status(200).send({ code: userEntry.codeOwned });
  }
  const codeOwned = getRandomCode();
  const newUserEntry: IReferralCollectionItem = {
    address,
    code: codeOwned,
    codeUsed: null,
    message: null,
    signature: null,
    invited: [],
  };
  await collection.insertOne(newUserEntry);
  return res.status(200).send({ code: codeOwned });
};
