/*
  Warnings:

  - A unique constraint covering the columns `[identificadorModulo]` on the table `Modulo` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Modulo" ADD COLUMN     "identificadorModulo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_identificadorModulo_key" ON "Modulo"("identificadorModulo");
