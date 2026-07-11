-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyIdleWarning" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifySound" BOOLEAN NOT NULL DEFAULT true;
