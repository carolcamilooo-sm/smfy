-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN     "operatorId" TEXT;

-- CreateIndex
CREATE INDEX "message_templates_operatorId_idx" ON "message_templates"("operatorId");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
