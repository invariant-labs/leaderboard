export enum Collections {
  Referrals = "referrals",
}

export interface IReferralCollectionItem {
  address: string;
  signature: string | null;
  message: string | Buffer | null;
  code: string;
  codeUsed: string | null;
  invited: string[];
}
