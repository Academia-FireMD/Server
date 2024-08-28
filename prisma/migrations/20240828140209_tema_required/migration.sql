/*
  Warnings:

  - Made the column `temaId` on table `Pregunta` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Pregunta" DROP CONSTRAINT "Pregunta_temaId_fkey";

-- AlterTable
ALTER TABLE "Pregunta" ALTER COLUMN "temaId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
