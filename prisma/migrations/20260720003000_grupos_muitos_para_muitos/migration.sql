-- Um atendente passa a poder estar em varios grupos ao mesmo tempo: um por
-- demanda, por exemplo, cada um com sua %. A coluna users.groupId so aguentava
-- um vinculo, entao vira tabela de ligacao.

-- CreateTable
CREATE TABLE "_GroupMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GroupMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_GroupMembers_B_index" ON "_GroupMembers"("B");

-- Copia os vinculos que ja existiam ANTES de derrubar a coluna, senao quem
-- estava num grupo sairia dele calado (e pararia de receber venda aprovada).
INSERT INTO "_GroupMembers" ("A", "B")
SELECT "groupId", "id" FROM "users" WHERE "groupId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "attendance_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupMembers" ADD CONSTRAINT "_GroupMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_groupId_fkey";

-- DropColumn
ALTER TABLE "users" DROP COLUMN "groupId";

-- Mesma politica das demais tabelas (o app fala como owner, que ignora RLS;
-- isto so satisfaz o Security Advisor do Supabase).
ALTER TABLE "_GroupMembers" ENABLE ROW LEVEL SECURITY;
