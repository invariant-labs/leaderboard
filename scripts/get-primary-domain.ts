import { TldParser } from "@onsol/tldparser";
import { Connection, PublicKey } from "@solana/web3.js";

const main = async () => {
  const owner = new PublicKey("74DjP9RTAB1ziNsxfjxSJsfvKUqtLx6RvQ8aYcMwGauH");
  const RPC_URL = "https://mainnetbeta-rpc.eclipse.xyz";
  const connection = new Connection(RPC_URL);
  const parser = new TldParser(connection);
  try {
    const domain = await parser.getMainDomain(owner);
    const domainName = domain.domain.concat(domain.tld);
    console.log(`Primary domain: ${domainName}`);
  } catch (e) {
    console.log("Owner does not have a primary domain");
  }
};
main();
