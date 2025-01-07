/*
  Warnings:

  - You are about to drop the column `actualizadoEn` on the `Documento` table. All the data in the column will be lost.
  - You are about to drop the column `creadoEn` on the `Documento` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Documento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Documento" DROP COLUMN "actualizadoEn",
DROP COLUMN "creadoEn",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
