/*
  Warnings:

  - You are about to drop the column `idInTest` on the `Pregunta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pregunta" DROP COLUMN "idInTest";

-- AlterTable
ALTER TABLE "TestPregunta" ADD COLUMN     "idInTest" INTEGER;
