export enum Collections {
  Referrals = "referrals",
}

export interface IReferralCollectionItem {
  address: string;
  codeOwned: string;
  codeUsed: string | null;
}
