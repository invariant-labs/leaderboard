import { Collections, IReferralCollectionItem } from "@/models/collections";
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

export const getMessagePayload = (address: PublicKey, code: string) => {
  return address.toString() + " is using referral " + code;
};

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
  if (
    !verifyMessage(
      Buffer.from(signature, "base64"),
      decodeUTF8(getMessagePayload(pubkey, code)),
      pubkey
    )
  ) {
    return res.status(400).send({ ok: false });
  }

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
  const collection = new Collection(Collections.Referrals);
  const { address } = req.params;
  const userEntry = await collection.findOne({ address });
  if (userEntry) {
    return res.status(200).send({ code: userEntry.code });
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
