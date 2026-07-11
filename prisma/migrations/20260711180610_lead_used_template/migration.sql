-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "usedTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_usedTemplateId_fkey" FOREIGN KEY ("usedTemplateId") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
