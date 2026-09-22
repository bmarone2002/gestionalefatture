export const CLIENT_TYPES = ["MUNICIPALITY", "PRIVATE_OR_BANKRUPTCY"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];

export const BILLING_FREQUENCIES = ["QUARTERLY", "SEMIANNUAL", "ANNUAL"] as const;
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

export const INVOICE_STATUSES = ["TO_ISSUE", "ISSUED", "PAID", "CANCELLED"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const CONTRACT_KINDS = ["STORAGE", "MOVEMENTS"] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

export const INVOICE_TYPES = ["ORDINARY", "SUPPLEMENTARY", "CREDIT_NOTE"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

export const SERVICE_UNITS = ["FIXED", "INTERVENTION", "PAGE", "SHIPMENT", "BOX"] as const;
export type ServiceUnit = (typeof SERVICE_UNITS)[number];

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
  ANNUAL: "Annuale",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  TO_ISSUE: "Da emettere",
  ISSUED: "Emessa",
  PAID: "Pagata",
  CANCELLED: "Annullata",
};

export const CONTRACT_KIND_LABELS: Record<ContractKind, string> = {
  STORAGE: "Stoccaggio",
  MOVEMENTS: "Movimentazioni",
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  ORDINARY: "Ordinaria",
  SUPPLEMENTARY: "Integrativa",
  CREDIT_NOTE: "Nota di credito",
};

export const SERVICE_UNIT_LABELS: Record<ServiceUnit, string> = {
  FIXED: "Importo fisso",
  INTERVENTION: "Intervento",
  PAGE: "Pagina",
  SHIPMENT: "Spedizione",
  BOX: "Scatola",
};

export const COMMITMENT_STATUS_LABELS: Record<CommitmentStatus, string> = {
  OK: "OK",
  ATTENTION: "Attenzione",
  CRITICAL: "Critico",
};

export function monthsForFrequency(frequency: BillingFrequency): 3 | 6 | 12 {
  if (frequency === "ANNUAL") return 12;
  return frequency === "QUARTERLY" ? 3 : 6;
}
