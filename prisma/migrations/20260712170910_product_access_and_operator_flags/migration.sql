-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "codigo" TEXT,
ADD COLUMN     "sigla" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priority" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_access" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "allowApproved" BOOLEAN NOT NULL DEFAULT false,
    "allowPending" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_access_productId_operatorId_key" ON "product_access"("productId", "operatorId");

-- AddForeignKey
ALTER TABLE "product_access" ADD CONSTRAINT "product_access_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_access" ADD CONSTRAINT "product_access_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
