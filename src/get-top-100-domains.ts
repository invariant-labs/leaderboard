import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { TldParser } from "@onsol/tldparser";
import * as fs from "fs";
import path from "path";
import { ITop100Domains } from "./types";
import { getTimestampInSeconds } from "./math";
import { DAY } from "./consts";
import { PublicKey } from "@solana/web3.js";

const getDomains = async () => {
  const previousTop100Data: ITop100Domains = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../data/top-100-domains.json"),
      "utf-8"
    )
  );
  const currentTimestamp = getTimestampInSeconds();
  if (
    new BN(previousTop100Data.timestamp, "hex").add(DAY).gt(currentTimestamp)
  ) {
    return;
  }

  const data = (
    JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../data/final_data_mainnet.json"),
        "utf-8"
      )
    ) as {
      address: string;
      rank: number;
      last24hPoints: string;
      points: string;
      positions: number;
    }[]
  )
    .slice(0, 100)
    .map((item) => item.address);

  const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
  const connection = provider.connection;
  const parser = new TldParser(connection);

  const finalTop100Domains = await Promise.all(
    data.map(async (addr) => {
      try {
        const domain = await parser.getMainDomain(new PublicKey(addr));
        const domainName = domain.domain.concat(domain.tld);
        return { address: addr, domain: domainName };
      } catch (e) {
        return { address: addr, domain: null };
      }
    })
  );
  const finalData = {
    timeStamp: currentTimestamp,
    domains: finalTop100Domains.reduce((acc, curr) => {
      acc[curr.address] = curr.domain;
      return acc;
    }, {} as Record<string, string | null>),
  };
  fs.writeFileSync(
    path.join(__dirname, "../data/top-100-domains.json"),
    JSON.stringify(finalData)
  );
};
getDomains();
