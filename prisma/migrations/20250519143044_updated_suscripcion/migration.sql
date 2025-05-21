/*
  Warnings:

  - A unique constraint covering the columns `[woocommerceSubscriptionId]` on the table `Suscripcion` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SuscripcionTipo" ADD VALUE 'PREMIUM';
ALTER TYPE "SuscripcionTipo" ADD VALUE 'ADVANCED';
ALTER TYPE "SuscripcionTipo" ADD VALUE 'BASIC';
ALTER TYPE "SuscripcionTipo" ADD VALUE 'TRAINING';
ALTER TYPE "SuscripcionTipo" ADD VALUE 'EXAM';

-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "isOfferPlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monthlyPrice" DOUBLE PRECISION,
ADD COLUMN     "offerDuration" INTEGER,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "woocommerceSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_woocommerceSubscriptionId_key" ON "Suscripcion"("woocommerceSubscriptionId");
