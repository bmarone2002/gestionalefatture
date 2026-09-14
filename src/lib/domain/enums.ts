export const CLIENT_TYPES = ["MUNICIPALITY", "PRIVATE_OR_BANKRUPTCY"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const BILLING_FREQUENCIES = ["QUARTERLY", "SEMIANNUAL"] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

export const INVOICE_STATUSES = ["TO_ISSUE", "ISSUED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const USER_ROLES = ["ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COMMITMENT_STATUSES = ["OK", "ATTENTION", "CRITICAL"] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  MUNICIPALITY: "Comune",
  PRIVATE_OR_BANKRUPTCY: "Privato / Fallimento",
};

export const FREQUENCY_LABELS: Record<BillingFrequency, string> = {
  QUARTERLY: "Trimestrale",
  SEMIANNUAL: "Semestrale",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  TO_ISSUE: "Da emettere",
  ISSUED: "Emessa",
};

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  OK: "OK",
  ATTENTION: "Attenzione",
  CRITICAL: "Critico",
};

export function monthsForFrequency(frequency: BillingFrequency): 3 | 6 {
  return frequency === "QUARTERLY" ? 3 : 6;
}
