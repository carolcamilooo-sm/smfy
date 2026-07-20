-- Webhook de vendas da empresa: um por gateway, valendo pra operacao toda. O
-- dono da venda sai de casar o comprador com um lead da fila.

-- CreateTable
CREATE TABLE "company_sales_webhooks" (
    "id" TEXT NOT NULL,
    "gateway" "Gateway" NOT NULL,
    "token" TEXT NOT NULL,
    "secret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_sales_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_sales_webhooks_gateway_key" ON "company_sales_webhooks"("gateway");
CREATE UNIQUE INDEX "company_sales_webhooks_token_key" ON "company_sales_webhooks"("token");

-- Vinculo da venda com o lead que a originou (nulo no webhook pessoal, onde
-- nao ha lead a casar).
ALTER TABLE "operator_sales" ADD COLUMN "leadId" TEXT;
ALTER TABLE "operator_sales" ADD CONSTRAINT "operator_sales_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sem estes indices, cada webhook varreria a tabela de leads inteira pra
-- achar o comprador.
CREATE INDEX "leads_document_idx" ON "leads"("document");
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

ALTER TABLE "company_sales_webhooks" ENABLE ROW LEVEL SECURITY;
