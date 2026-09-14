-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('MUNICIPALITY', 'PRIVATE_OR_BANKRUPTCY');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('QUARTERLY', 'SEMIANNUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('TO_ISSUE', 'ISSUED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ClientType" NOT NULL,
    "taxCode" TEXT,
    "vatNumber" TEXT,
    "notes" TEXT,
    "boxQuantity" INTEGER NOT NULL,
    "monthlyPricePerBox" DECIMAL(12,4) NOT NULL,
    "billingFrequency" "BillingFrequency" NOT NULL,
    "registrationDate" DATE NOT NULL,
    "determina" TEXT,
    "cig" TEXT,
    "commitmentAmount" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "billingFrequency" "BillingFrequency" NOT NULL,
    "boxQuantitySnapshot" INTEGER NOT NULL,
    "monthlyPriceSnapshot" DECIMAL(12,4) NOT NULL,
    "monthsSnapshot" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "issuedById" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_type_active_idx" ON "Client"("type", "active");

-- CreateIndex
CREATE INDEX "Invoice_status_scheduledDate_idx" ON "Invoice"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "Invoice_clientId_status_idx" ON "Invoice"("clientId", "status");

-- CreateIndex
CREATE INDEX "Invoice_scheduledDate_idx" ON "Invoice"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_clientId_periodStart_periodEnd_key" ON "Invoice"("clientId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
