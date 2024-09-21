/*
  Warnings:

  - You are about to drop the column `esDeRepaso` on the `Pregunta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FlashcardTest" ADD COLUMN     "esDeRepaso" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Pregunta" DROP COLUMN "esDeRepaso";
