-- Teto de pagos na fila do atendente: enquanto tiver este tanto (ou mais) de
-- pago nao atendido, para de receber leads novos (mantem o buffer cheio).
-- null = sem teto. IF NOT EXISTS pra ser idempotente caso ja aplicada manual.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "maxPaidQueue" INTEGER;
