import app from "@/app";
import { Collections, IReferralCollectionItem } from "@/models/collections";
import { FastifyRequest, FastifyReply } from "fastify";
import { PublicKey } from "@solana/web3.js";
import crypto from "crypto";
import { randomPublickey } from "@config/index";
interface IUseCodeBody {
  address: string;
  code: string;
}
interface IGetCodeParams {
  address: string;
}

export const getCodeFromAddress = (address: string): string => {
  const publickKeyFromAddress = new PublicKey(address);
  const combined = Buffer.concat([
    publickKeyFromAddress.toBuffer(),
    randomPublickey.toBuffer(),
  ]);
  const hash = crypto.createHash("sha256").update(combined).digest("hex");
  return hash;
};

export const getReferralCodes = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const referrals = (
    await app.db.collection(Collections.Referrals).find({}).toArray()
  ).map((item) => item.codeOwned);
  res.send(referrals);
};

export const useCode = async (
  req: FastifyRequest<{ Body: IUseCodeBody }>,
  res: FastifyReply
) => {
  const { address, code } = req.body;
  const isCodeValid = (
    await app.db.collection(Collections.Referrals).find({}).toArray()
  ).find((item) => item.codeOwned === code);
  if (!isCodeValid) {
    res.send(400);
  }
  const userEntry = await app.db
    .collection(Collections.Referrals)
    .findOne({ address });
  if (userEntry) {
    await app.db
      .collection(Collections.Referrals)
      .findOneAndUpdate({ address }, { address, codeUsed: code });
    res.send(200);
  }
  const codeOwned = getCodeFromAddress(address);
  const newUserEntry: IReferralCollectionItem = {
    address,
    codeOwned,
    codeUsed: code,
  };
  await app.db.collection(Collections.Referrals).insertOne(newUserEntry);
  res.send(200);
};

export const getCode = async (
  req: FastifyRequest<{ Params: IGetCodeParams }>,
  res: FastifyReply
) => {
  const { address } = req.params;
  const userEntry = await app.db
    .collection(Collections.Referrals)
    .findOne({ address });
  if (userEntry) {
    res.send({ code: userEntry.codeOwned });
  }
  const codeOwned = getCodeFromAddress(address);
  const newUserEntry: IReferralCollectionItem = {
    address,
    codeOwned,
    codeUsed: null,
  };
  await app.db.collection(Collections.Referrals).insertOne(newUserEntry);
  res.send({ code: codeOwned });
};
