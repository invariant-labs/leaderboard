import app from "@/app";
import { Collections, IReferralCollectionItem } from "@/models/collections";
import { getMessagePayload } from "@invariant-labs/points-sdk/src/utils";
import { getDatabaseClient } from "@plugins/db.plugin";
import { Collection } from "@services/collection.service";
import { verifyMessage, getRandomCode } from "@services/utils";
import { PublicKey } from "@solana/web3.js";
import { FastifyRequest, FastifyReply } from "fastify";
import { decodeUTF8 } from "tweetnacl-util";

interface IUseCodeBody {
  address: string;
  code: string;
  signature: string;
}
interface IGetCodeParams {
  address: string;
}

export const getReferralCodes = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const collection = new Collection(Collections.Referrals);
  const referrals = await collection.getAllElementsAsArray();
  res.send(referrals);
};

export const useCode = async (
  req: FastifyRequest<{ Body: IUseCodeBody }>,
  res: FastifyReply
) => {
  const collection = new Collection(Collections.Referrals);
  const { address, code, signature } = req.body;
  const pubkey = new PublicKey(address);
  const dbClient = getDatabaseClient();
  const session = dbClient.startSession();
  if (
    !verifyMessage(
      Buffer.from(signature, "base64"),
      decodeUTF8(getMessagePayload(pubkey, code)),
      pubkey
    )
  ) {
    return res.status(400).send({ ok: false });
  }

  try {
    session.startTransaction();
    const referrerEntry = await collection.findOne({ code });
    if (!referrerEntry) {
      await session.abortTransaction();
      res.status(400).send({ ok: false });
      return;
    }

    await collection.addToInvitedList(code, address);

    await collection.instertOrUpdateOne(
      address,
      getRandomCode(),
      code,
      signature
    );

    await session.commitTransaction();
    res.status(200).send({ ok: true });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).send({ ok: false });
  } finally {
    await session.endSession();
  }
};

export const getCode = async (
  req: FastifyRequest<{ Params: IGetCodeParams }>,
  res: FastifyReply
) => {
  const collection = new Collection(Collections.Referrals);
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
    signature: null,
    invited: [],
  };
  await collection.insertOne(newUserEntry);
  return res.status(200).send({ code: codeOwned });
};
