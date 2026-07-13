-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dashboardLayout" TEXT[] DEFAULT ARRAY[]::TEXT[];
