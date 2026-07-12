-- AlterEnum
ALTER TYPE "Gateway" ADD VALUE 'PAYT';

-- AlterTable
ALTER TABLE "producers" ADD COLUMN     "paytIntegrationKey" TEXT;
