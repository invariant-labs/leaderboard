import {
  InvariantEventNames,
  Market,
  parseEvent,
} from "@invariant-labs/sdk-eclipse";
import {
  Connection,
  PublicKey,
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
} from "@solana/web3.js";

export const fetchAllSignatures = async (
  connection: Connection,
  address: PublicKey,
  lastTxHash: string | undefined
) => {
  const allSignatures: ConfirmedSignatureInfo[] = [];
  let beforeTxHash: string | undefined = undefined;
  let done: boolean = false;

  while (!done) {
    const signatures = await connection.getSignaturesForAddress(
      address,
      { before: beforeTxHash, until: lastTxHash },
      "confirmed"
    );

    if (signatures.length === 0) {
      done = true;
      break;
    }

    allSignatures.push(...signatures);
    if (lastTxHash === undefined) {
      done = true;
      break;
    }
    if (signatures[signatures.length - 1].signature === lastTxHash) {
      done = true;
    } else {
      beforeTxHash = signatures[signatures.length - 1].signature;
    }
  }

  return allSignatures.map((signatureInfo) => signatureInfo.signature);
};

export const processParsedTransactions = (
  parsedTransactions: (ParsedTransactionWithMeta | null)[]
) => {
  return parsedTransactions
    .filter((tx) => tx?.meta?.logMessages && tx.transaction.signatures[0])
    .map((tx) => {
      return tx!.meta!.logMessages!;
    });
};

export const fetchTransactionLogs = async (
  connection: Connection,
  signatures: string[],
  batchSize: number
) => {
  const batchCount = Math.ceil(signatures.length / batchSize);
  const batchedSignatures = new Array(batchCount).fill(0);

  return (
    await Promise.all(
      batchedSignatures.map(async (_, idx) => {
        const batchSignatures = signatures.slice(
          idx * batchSize,
          (idx + 1) * batchSize
        );
        return processParsedTransactions(
          await connection.getParsedTransactions(batchSignatures, "confirmed")
        );
      })
    )
  ).flat();
};

export const extractEvents = (
  initialEvents: any,
  market: Market,
  transactionLog: string[]
) => {
  const eventsObject = initialEvents;

  const eventLogs: string[] = [];

  transactionLog.map((log, index) => {
    if (
      log.startsWith("Program data:") &&
      transactionLog[index + 1].startsWith(
        `Program ${market.program.programId.toBase58()}`
      )
    )
      eventLogs.push(log);
  });

  eventLogs.forEach((eventLog) => {
    const decodedEvent = market.eventDecoder.decode(
      eventLog.split("Program data: ")[1]
    );
    if (!decodedEvent) {
      return;
    }

    switch (decodedEvent.name) {
      case InvariantEventNames.CreatePositionEvent:
        eventsObject[InvariantEventNames.CreatePositionEvent].push(
          parseEvent(decodedEvent)
        );
        break;
      case InvariantEventNames.RemovePositionEvent:
        eventsObject[InvariantEventNames.RemovePositionEvent].push(
          parseEvent(decodedEvent)
        );
        break;
      default:
        return;
    }
  });
  return eventsObject;
};
