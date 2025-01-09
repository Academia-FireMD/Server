/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Documento` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Documento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Documento" DROP CONSTRAINT "Documento_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Test" DROP CONSTRAINT "Test_realizadorId_fkey";

-- AlterTable
ALTER TABLE "Documento" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_realizadorId_fkey" FOREIGN KEY ("realizadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
