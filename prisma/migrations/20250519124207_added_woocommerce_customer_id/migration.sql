/*
  Warnings:

  - A unique constraint covering the columns `[woocommerceCustomerId]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "woocommerceCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_woocommerceCustomerId_key" ON "Usuario"("woocommerceCustomerId");
