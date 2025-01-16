import fs from "fs";
import path from "path";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { DAY, DOMAIN_LIMIT } from "./consts";
import { PublicKey } from "@solana/web3.js";
import { TldParser } from "@onsol/tldparser";
import { getTimestampInSeconds } from "./math";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

export const addDomains = async () => {
  const domainsFile = path.join(__dirname, "../data/domains.json");
  const prevDomains = JSON.parse(fs.readFileSync(domainsFile, "utf-8"));
  const now = getTimestampInSeconds();

  if (new BN(prevDomains.timestamp, "hex").add(DAY).gt(now)) {
    console.log("Eclipse: Domains are up to date");
    return;
  }

  const finalDataFile = path.join(__dirname, "../data/final_data_mainnet.json");
  const finalDataSwapFile = path.join(
    __dirname,
    "../data/final_data_swap_mainnet.json"
  );
  const finalDataLpFile = path.join(
    __dirname,
    "../data/final_data_lp_mainnet.json"
  );

  const provider = AnchorProvider.local("https://eclipse.helius-rpc.com");
  const connection = provider.connection;

  const totalData = JSON.parse(fs.readFileSync(finalDataFile, "utf-8"));
  const totalSwapData = JSON.parse(fs.readFileSync(finalDataSwapFile, "utf-8"));
  const totalLpData = JSON.parse(fs.readFileSync(finalDataLpFile, "utf-8"));

  const addresses = new Set<PublicKey>();

  for (let i = 0; i < DOMAIN_LIMIT; i++) {
    addresses.add(new PublicKey(totalData[i].address));
    addresses.add(new PublicKey(totalSwapData[i].address));
    addresses.add(new PublicKey(totalLpData[i].address));
  }

  const domains = {};
  const parser = new TldParser(connection);
  for (const address of addresses) {
    try {
      const domain = await parser.getMainDomain(address);
      const domainName = domain.domain.concat(domain.tld);
      domains[address.toString()] = domainName;
    } catch (e) {
      console.log(
        `Address ${address.toString()} does not have a primary domain`
      );
    }
  }

  const data = {
    domains,
    timestamp: now,
  };

  for (let i = 0; i < DOMAIN_LIMIT; i++) {
    totalData[i].domain = domains[totalData[i].address];
    totalSwapData[i].domain = domains[totalSwapData[i].address];
    totalLpData[i].domain = domains[totalLpData[i].address];
  }

  fs.writeFileSync(domainsFile, JSON.stringify(data, null, 2));
  fs.writeFileSync(finalDataFile, JSON.stringify(totalData));
  fs.writeFileSync(finalDataSwapFile, JSON.stringify(totalSwapData));
  fs.writeFileSync(finalDataLpFile, JSON.stringify(totalLpData));
};

addDomains().then(
  () => {
    console.log("Eclipse: domains added!");
  },
  (err) => {
    console.log(err);
  }
);
