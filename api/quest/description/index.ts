import { VercelRequest, VercelResponse } from "@vercel/node";

interface IDescriptionData {
  questProvider: string;
  questProviderUrl: string;
}

export default function (req: VercelRequest, res: VercelResponse) {
  // @ts-expect-error
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  const questProvider = "Invariant";
  const questProviderUrl = "https://eclipse.invariant.app/";

  const descriptionData: IDescriptionData = {
    questProvider,
    questProviderUrl,
  };

  res.json(descriptionData);
}
