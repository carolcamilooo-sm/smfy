-- Temporizador de ociosidade por atendente: minutos sem atividade ate ficar
-- ocioso e offline. Antes era fixo em 10/15 min no codigo.
ALTER TABLE "users" ADD COLUMN "idleTimeoutMinutes" INTEGER NOT NULL DEFAULT 10;
