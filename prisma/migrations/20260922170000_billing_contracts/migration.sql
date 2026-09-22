-- Extend legacy enums without invalidating existing rows.
ALTER TYPE "BillingFrequency" ADD VALUE IF NOT EXISTS 'ANNUAL';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "ContractKind" AS ENUM ('STORAGE', 'MOVEMENTS');
CREATE TYPE "ServiceUnit" AS ENUM ('FIXED', 'INTERVENTION', 'PAGE', 'SHIPMENT', 'BOX');
CREATE TYPE "ServiceBillingMode" AS ENUM ('ONE_OFF', 'ANNUAL', 'USAGE', 'STORAGE');
CREATE TYPE "InvoiceType" AS ENUM ('ORDINARY', 'SUPPLEMENTARY', 'CREDIT_NOTE');
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');
CREATE TYPE "InflationAdjustmentStatus" AS ENUM ('PREVIEW', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "Contract" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "kind" "ContractKind" NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContractVersion" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "determina" TEXT,
  "cig" TEXT,
  "commitmentAmount" DECIMAL(12,2),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceDefinition" (
  "id" TEXT NOT NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "unit" "ServiceUnit" NOT NULL,
  "billingMode" "ServiceBillingMode" NOT NULL,
  "standard" BOOLEAN NOT NULL DEFAULT false,
  "clientId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientService" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "serviceDefinitionId" TEXT NOT NULL,
  "billingFrequency" "BillingFrequency",
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InflationAdjustment" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "percentage" DECIMAL(8,4) NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "status" "InflationAdjustmentStatus" NOT NULL DEFAULT 'PREVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "confirmedById" TEXT,
  CONSTRAINT "InflationAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceVersion" (
  "id" TEXT NOT NULL,
  "clientServiceId" TEXT NOT NULL,
  "unitPriceVatIncluded" DECIMAL(12,4) NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "inflationAdjustmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriceVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invoice"
  ADD COLUMN "contractId" TEXT,
  ADD COLUMN "contractVersionId" TEXT,
  ADD COLUMN "invoiceType" "InvoiceType" NOT NULL DEFAULT 'ORDINARY',
  ADD COLUMN "externalNumber" TEXT,
  ADD COLUMN "externalDate" DATE,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "parentInvoiceId" TEXT;

DROP INDEX "Invoice_clientId_periodStart_periodEnd_key";

CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "serviceDefinitionId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" "ServiceUnit" NOT NULL,
  "unitPriceVatIncluded" DECIMAL(12,4) NOT NULL,
  "months" INTEGER,
  "periodStart" DATE,
  "periodEnd" DATE,
  "amountVatIncluded" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceMovement" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "clientServiceId" TEXT NOT NULL,
  "serviceDefinitionId" TEXT NOT NULL,
  "occurredOn" DATE NOT NULL,
  "description" TEXT,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unitPriceVatIncluded" DECIMAL(12,4),
  "totalVatIncluded" DECIMAL(12,2) NOT NULL,
  "permanentStockExit" BOOLEAN NOT NULL DEFAULT false,
  "stockQuantity" INTEGER,
  "invoiceLineId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "ServiceMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "occurredOn" DATE NOT NULL,
  "reason" TEXT,
  "serviceMovementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "paidAt" DATE NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedById" TEXT,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Predefined catalog. Prices are always supplied by each client list.
INSERT INTO "ServiceDefinition"
  ("id", "code", "name", "unit", "billingMode", "standard", "active", "createdAt", "updatedAt")
VALUES
  ('svc_storage', 'STORAGE', 'STOCCAGGIO SCATOLE', 'BOX', 'STORAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_start_up', 'START_UP', 'START UP', 'FIXED', 'ONE_OFF', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_ritiro_pratiche', 'RITIRO_PRATICHE', 'RITIRO PRATICHE', 'INTERVENTION', 'USAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_monitora_doc', 'CANONE_MONITORA_DOC', 'CANONE ANNUO PIATTAFORMA MONITORA DOC', 'FIXED', 'ANNUAL', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_scansioni', 'SCANSIONI_ON_DEMAND', 'SCANSIONI ON DEMAND', 'PAGE', 'USAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_scansioni_urgenti', 'SCANSIONI_ON_DEMAND_URGENTI', 'SCANSIONI ON DEMAND CON URGENZA', 'PAGE', 'USAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_invio_originale', 'INVIO_ORIGINALE', 'INVIO ORIGINALE', 'SHIPMENT', 'USAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_invio_originale_urgente', 'INVIO_ORIGINALE_URGENTE', 'INVIO ORIGINALE CON URGENZA', 'SHIPMENT', 'USAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('svc_macero', 'MACERO', 'MACERO', 'BOX', 'USAGE', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Deterministic backfill: safe to inspect and repeat in staging.
INSERT INTO "Contract"
  ("id", "clientId", "kind", "name", "startDate", "active", "createdAt", "updatedAt", "createdById")
SELECT
  'legacy_contract_' || c."id", c."id", 'STORAGE', 'Contratto stoccaggio',
  c."registrationDate", c."active", c."createdAt", CURRENT_TIMESTAMP, c."createdById"
FROM "Client" c
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ContractVersion"
  ("id", "contractId", "versionNumber", "effectiveFrom", "determina", "cig", "commitmentAmount", "createdAt")
SELECT
  'legacy_contract_version_' || c."id", 'legacy_contract_' || c."id", 1,
  c."registrationDate", c."determina", c."cig", c."commitmentAmount", c."createdAt"
FROM "Client" c
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "ClientService"
  ("id", "clientId", "contractId", "serviceDefinitionId", "billingFrequency", "active", "createdAt", "updatedAt")
SELECT
  'legacy_storage_service_' || c."id", c."id", 'legacy_contract_' || c."id",
  'svc_storage', c."billingFrequency", c."active", c."createdAt", CURRENT_TIMESTAMP
FROM "Client" c
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PriceVersion"
  ("id", "clientServiceId", "unitPriceVatIncluded", "effectiveFrom", "source", "createdAt")
SELECT
  'legacy_storage_price_' || c."id", 'legacy_storage_service_' || c."id",
  c."monthlyPricePerBox", c."registrationDate", 'LEGACY_IMPORT', c."createdAt"
FROM "Client" c
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "StockMovement"
  ("id", "clientId", "contractId", "type", "quantity", "occurredOn", "reason", "createdAt")
SELECT
  'legacy_opening_stock_' || c."id", c."id", 'legacy_contract_' || c."id",
  'IN', c."boxQuantity", c."registrationDate", 'Consistenza iniziale importata', c."createdAt"
FROM "Client" c
WHERE c."boxQuantity" > 0
ON CONFLICT ("id") DO NOTHING;

UPDATE "Invoice" i
SET
  "contractId" = 'legacy_contract_' || i."clientId",
  "contractVersionId" = 'legacy_contract_version_' || i."clientId",
  "idempotencyKey" = 'legacy_invoice_' || i."id"
WHERE i."contractId" IS NULL;

INSERT INTO "InvoiceLine"
  ("id", "invoiceId", "serviceDefinitionId", "description", "quantity", "unit",
   "unitPriceVatIncluded", "months", "periodStart", "periodEnd", "amountVatIncluded", "createdAt")
SELECT
  'legacy_invoice_line_' || i."id", i."id", 'svc_storage', 'Stoccaggio scatole',
  i."boxQuantitySnapshot", 'BOX', i."monthlyPriceSnapshot", i."monthsSnapshot",
  i."periodStart", i."periodEnd", i."amount", i."createdAt"
FROM "Invoice" i
ON CONFLICT ("id") DO NOTHING;

CREATE UNIQUE INDEX "Contract_active_kind_per_client_key"
  ON "Contract"("clientId", "kind") WHERE "active" = true;
CREATE UNIQUE INDEX "ServiceDefinition_code_key" ON "ServiceDefinition"("code");
CREATE UNIQUE INDEX "ClientService_clientId_contractId_serviceDefinitionId_key"
  ON "ClientService"("clientId", "contractId", "serviceDefinitionId");
CREATE UNIQUE INDEX "ContractVersion_contractId_versionNumber_key"
  ON "ContractVersion"("contractId", "versionNumber");
CREATE UNIQUE INDEX "PriceVersion_clientServiceId_effectiveFrom_key"
  ON "PriceVersion"("clientServiceId", "effectiveFrom");
CREATE UNIQUE INDEX "InflationAdjustment_contractId_effectiveFrom_key"
  ON "InflationAdjustment"("contractId", "effectiveFrom");
CREATE UNIQUE INDEX "Invoice_idempotencyKey_key" ON "Invoice"("idempotencyKey");
CREATE UNIQUE INDEX "StockMovement_serviceMovementId_key" ON "StockMovement"("serviceMovementId");

CREATE INDEX "Contract_clientId_kind_active_idx" ON "Contract"("clientId", "kind", "active");
CREATE INDEX "Contract_endDate_active_idx" ON "Contract"("endDate", "active");
CREATE INDEX "ContractVersion_contractId_effectiveFrom_effectiveTo_idx" ON "ContractVersion"("contractId", "effectiveFrom", "effectiveTo");
CREATE INDEX "ServiceDefinition_clientId_active_idx" ON "ServiceDefinition"("clientId", "active");
CREATE INDEX "ClientService_contractId_active_idx" ON "ClientService"("contractId", "active");
CREATE INDEX "PriceVersion_clientServiceId_effectiveFrom_effectiveTo_idx" ON "PriceVersion"("clientServiceId", "effectiveFrom", "effectiveTo");
CREATE INDEX "Invoice_contractId_status_scheduledDate_idx" ON "Invoice"("contractId", "status", "scheduledDate");
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");
CREATE INDEX "InvoiceLine_serviceDefinitionId_idx" ON "InvoiceLine"("serviceDefinitionId");
CREATE INDEX "ServiceMovement_contractId_occurredOn_idx" ON "ServiceMovement"("contractId", "occurredOn");
CREATE INDEX "ServiceMovement_clientServiceId_invoiceLineId_idx" ON "ServiceMovement"("clientServiceId", "invoiceLineId");
CREATE INDEX "StockMovement_contractId_occurredOn_idx" ON "StockMovement"("contractId", "occurredOn");
CREATE INDEX "Payment_invoiceId_paidAt_idx" ON "Payment"("invoiceId", "paidAt");
CREATE INDEX "InflationAdjustment_status_effectiveFrom_idx" ON "InflationAdjustment"("status", "effectiveFrom");

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceDefinition" ADD CONSTRAINT "ServiceDefinition_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientService" ADD CONSTRAINT "ClientService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientService" ADD CONSTRAINT "ClientService_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientService" ADD CONSTRAINT "ClientService_serviceDefinitionId_fkey" FOREIGN KEY ("serviceDefinitionId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InflationAdjustment" ADD CONSTRAINT "InflationAdjustment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InflationAdjustment" ADD CONSTRAINT "InflationAdjustment_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriceVersion" ADD CONSTRAINT "PriceVersion_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceVersion" ADD CONSTRAINT "PriceVersion_inflationAdjustmentId_fkey" FOREIGN KEY ("inflationAdjustmentId") REFERENCES "InflationAdjustment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractVersionId_fkey" FOREIGN KEY ("contractVersionId") REFERENCES "ContractVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_parentInvoiceId_fkey" FOREIGN KEY ("parentInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_serviceDefinitionId_fkey" FOREIGN KEY ("serviceDefinitionId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMovement" ADD CONSTRAINT "ServiceMovement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMovement" ADD CONSTRAINT "ServiceMovement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMovement" ADD CONSTRAINT "ServiceMovement_clientServiceId_fkey" FOREIGN KEY ("clientServiceId") REFERENCES "ClientService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMovement" ADD CONSTRAINT "ServiceMovement_serviceDefinitionId_fkey" FOREIGN KEY ("serviceDefinitionId") REFERENCES "ServiceDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMovement" ADD CONSTRAINT "ServiceMovement_invoiceLineId_fkey" FOREIGN KEY ("invoiceLineId") REFERENCES "InvoiceLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceMovement" ADD CONSTRAINT "ServiceMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_serviceMovementId_fkey" FOREIGN KEY ("serviceMovementId") REFERENCES "ServiceMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
