/*
  Warnings:

  - You are about to drop the column `idInTest` on the `TestPregunta` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SeguridadAlResponder" ADD VALUE 'CERO_POR_CIENTO';

-- AlterTable
ALTER TABLE "TestPregunta" DROP COLUMN "idInTest";
