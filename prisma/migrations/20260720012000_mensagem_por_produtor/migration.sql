-- Mensagem de atendimento passa a poder pertencer a um produtor: assim o
-- atendente so ve, na fila, as copies daquele produto, sem risco de mandar a
-- do produto errado. Nulo = vale pra qualquer lead, que e como ficam as
-- mensagens ja existentes.

-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN "producerId" TEXT;

-- CreateIndex
CREATE INDEX "message_templates_producerId_idx" ON "message_templates"("producerId");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
