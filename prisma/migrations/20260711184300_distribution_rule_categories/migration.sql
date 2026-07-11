-- AlterTable: split single "weight" into per-category weights
ALTER TABLE "distribution_rules" ADD COLUMN     "weightApproved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weightPending" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "weightDeclined" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve existing distribution proportions across all 3 categories
UPDATE "distribution_rules" SET "weightApproved" = "weight", "weightPending" = "weight", "weightDeclined" = "weight";

-- AlterTable
ALTER TABLE "distribution_rules" DROP COLUMN "weight";
