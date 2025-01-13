import app from "../app";
import { Collections, IReferralCollectionItem } from "../models/collections";
import { Collection } from "../services/collection.service";
import {
  verifyMessage,
  getRandomCode,
  getMessagePayload,
} from "../services/utils";
import { PublicKey } from "@solana/web3.js";
import { FastifyRequest, FastifyReply } from "fastify";
import tweetnacl from "tweetnacl-util";

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
  const referrals = await collection.getReferrersAndReferred();
  const filteredReferrals = referrals.reduce(
    (
      acc: Record<
        string,
        {
          signature: string | null;
          code: string;
          codeUsed: string | null;
          invited: string[];
        }
      >,
      curr
    ) => {
      const { address, _id, ...data } = curr;
      acc[address] = data as Omit<IReferralCollectionItem, "address">;
      return acc;
    },
    {}
  );
  res.send(filteredReferrals);
};

export const useCode = async (
  req: FastifyRequest<{ Body: IUseCodeBody }>,
  res: FastifyReply
) => {
  const collection = new Collection(Collections.Referrals);
  const { address, code, signature } = req.body;
  const pubkey = new PublicKey(address);
  const dbClient = app.mongoClient;
  const session = dbClient.startSession();
  if (
    !verifyMessage(
      Buffer.from(signature, "base64"),
      tweetnacl.decodeUTF8(getMessagePayload(pubkey, code)),
      pubkey
    )
  ) {
    return res.status(400).send({ ok: false });
  }

  try {
    session.startTransaction();
    const referrerEntry = await collection.findOne({ code });
    const userEntry = await collection.findOne({ address });

    if (!referrerEntry || (userEntry && userEntry.codeUsed)) {
      await session.abortTransaction();
      res.status(400).send({ ok: false });
      return;
    }

    if (userEntry?.address === referrerEntry.address) {
      await session.abortTransaction();
      res.status(400).send({ ok: false });
      return;
    }

    await collection.addToInvitedList(code, address);
    await collection.insertOrUpdateOne(
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

export const insertMockCodes = async (
  req: FastifyRequest,
  res: FastifyReply
) => {
  const collection = new Collection(Collections.Referrals);
  const addresses = [
    "BtGH2WkM1oNyPVgzYT51xV2gJqHhVQ4QiGwWirBUW5xN", //
    "A3sjWSa4rNspqqZQFjMMbmmnbgvYDRRMiWjyaTbMyYG4", // uses first address code
    "9BNu7C9f3cGS4fBS5jKvG2XASHGVVnBxR2XAW4q4ZYUE", // uses first address code
    "63CQPyL9xzCSy4ejNuqxxqfjRpAGVKa1KbJUvXfRSKZK", // uses third address code
    "6usfBWrWdKoA5BvyAqjjU4R8yKuWbP8JkofrtPk3Rupw", // uses third address code
  ];

  const dbClient = app.mongoClient;

  const firstAddress = addresses[0];
  const firstAddressEntry: IReferralCollectionItem = {
    address: firstAddress,
    code: getRandomCode(),
    codeUsed: null,
    signature: null,
    invited: [],
  };
  await collection.insertOne(firstAddressEntry);

  for (const address of [addresses[1], addresses[2]]) {
    const session = dbClient.startSession();
    try {
      session.startTransaction();

      const referrerEntry = await collection.findOne({ address: firstAddress });
      const userEntry = await collection.findOne({ address });

      if (!referrerEntry || (userEntry && !!userEntry.codeUsed)) {
        await session.abortTransaction();
        continue;
      }

      await collection.addToInvitedList(referrerEntry.code, address);
      await collection.insertOrUpdateOne(
        address,
        getRandomCode(),
        referrerEntry.code,
        "signature"
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }

  const thirdAddress = addresses[2];
  for (const address of [addresses[3], addresses[4]]) {
    const session = dbClient.startSession();
    try {
      session.startTransaction();

      const referrerEntry = await collection.findOne({ address: thirdAddress });
      const userEntry = await collection.findOne({ address });

      if (!referrerEntry || (userEntry && !!userEntry.codeUsed)) {
        await session.abortTransaction();
        continue;
      }

      await collection.addToInvitedList(referrerEntry.code, address);
      await collection.insertOrUpdateOne(
        address,
        getRandomCode(),
        referrerEntry.code,
        "signature"
      );

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }
  }

  res.status(200).send({ ok: true });
};
