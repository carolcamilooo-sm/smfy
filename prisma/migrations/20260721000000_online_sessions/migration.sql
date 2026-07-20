-- Sessoes online do atendente: uma linha por periodo online, pra somar o tempo
-- do dia, semana e mes. Antes o sistema so sabia o status atual.

CREATE TABLE "online_sessions" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "online_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "online_sessions_operatorId_startedAt_idx" ON "online_sessions"("operatorId", "startedAt");

ALTER TABLE "online_sessions" ADD CONSTRAINT "online_sessions_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "online_sessions" ENABLE ROW LEVEL SECURITY;
