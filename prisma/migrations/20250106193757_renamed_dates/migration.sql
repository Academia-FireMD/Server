/*
  Warnings:

  - You are about to drop the column `creadoPorId` on the `Documento` table. All the data in the column will be lost.
  - Added the required column `createdById` to the `Documento` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Documento" DROP CONSTRAINT "Documento_creadoPorId_fkey";

-- AlterTable
ALTER TABLE "Documento" DROP COLUMN "creadoPorId",
ADD COLUMN     "createdById" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
