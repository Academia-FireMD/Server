/*
  Warnings:

  - You are about to drop the column `deReserva` on the `Pregunta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pregunta" DROP COLUMN "deReserva";

-- AlterTable
ALTER TABLE "TestPregunta" ADD COLUMN     "deReserva" BOOLEAN NOT NULL DEFAULT false;
