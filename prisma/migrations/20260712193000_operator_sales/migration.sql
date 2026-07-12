-- AlterTable
ALTER TABLE "users" ADD COLUMN     "salesWebhookToken" TEXT;

-- CreateTable
CREATE TABLE "operator_sales" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "gateway" "Gateway" NOT NULL,
    "externalId" TEXT NOT NULL,
    "customerName" TEXT,
    "value" DECIMAL(10,2),
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_salesWebhookToken_key" ON "users"("salesWebhookToken");

-- CreateIndex
CREATE UNIQUE INDEX "operator_sales_operatorId_gateway_externalId_key" ON "operator_sales"("operatorId", "gateway", "externalId");

-- CreateIndex
CREATE INDEX "operator_sales_operatorId_createdAt_idx" ON "operator_sales"("operatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "operator_sales" ADD CONSTRAINT "operator_sales_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
