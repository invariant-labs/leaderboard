export enum Collections {
  Referrals = "referrals",
}

export interface IReferralCollectionItem {
  address: string;
  signature: string | null;
  code: string;
  codeUsed: string | null;
  invited: string[];
}
