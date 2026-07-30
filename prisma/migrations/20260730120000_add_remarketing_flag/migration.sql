-- Marca de remarketing: lead reenviado pro atendente a partir do histórico.
ALTER TABLE "leads" ADD COLUMN "remarketing" BOOLEAN NOT NULL DEFAULT false;
