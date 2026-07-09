-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "OperatorStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "Gateway" AS ENUM ('KIWIFY', 'PERFECTPAY', 'DISRUPTY', 'SMPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('APPROVED', 'PENDING', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('WAITING', 'ASSIGNED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "LeadEventAction" AS ENUM ('ASSIGNED', 'ATTENDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "status" "OperatorStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_rules" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "distribution_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "gateway" "Gateway" NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "product" TEXT,
    "value" DECIMAL(10,2),
    "paymentStatus" "PaymentStatus" NOT NULL,
    "serviceStatus" "ServiceStatus" NOT NULL DEFAULT 'WAITING',
    "assignedOperatorId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_events" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "action" "LeadEventAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_rules_operatorId_key" ON "distribution_rules"("operatorId");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "leads_serviceStatus_idx" ON "leads"("serviceStatus");

-- CreateIndex
CREATE INDEX "leads_assignedOperatorId_idx" ON "leads"("assignedOperatorId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_gateway_externalId_key" ON "leads"("gateway", "externalId");

-- CreateIndex
CREATE INDEX "lead_events_operatorId_createdAt_idx" ON "lead_events"("operatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "distribution_rules" ADD CONSTRAINT "distribution_rules_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedOperatorId_fkey" FOREIGN KEY ("assignedOperatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_events" ADD CONSTRAINT "lead_events_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

