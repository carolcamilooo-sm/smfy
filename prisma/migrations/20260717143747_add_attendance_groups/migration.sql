-- CreateTable
CREATE TABLE "attendance_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightApproved" INTEGER NOT NULL DEFAULT 0,
    "weightPending" INTEGER NOT NULL DEFAULT 0,
    "weightDeclined" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_groups_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "groupId" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "attendance_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Habilita RLS na tabela nova, como as demais (o app fala via conexão direta
-- como owner, que ignora RLS; isto só satisfaz o Security Advisor do Supabase).
ALTER TABLE "attendance_groups" ENABLE ROW LEVEL SECURITY;
