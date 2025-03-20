/*
  Warnings:

  - You are about to drop the `PreguntaReserva` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PreguntaTemporal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PreguntaReserva" DROP CONSTRAINT "PreguntaReserva_examenId_fkey";

-- DropForeignKey
ALTER TABLE "PreguntaReserva" DROP CONSTRAINT "PreguntaReserva_testPreguntaId_fkey";

-- DropForeignKey
ALTER TABLE "PreguntaTemporal" DROP CONSTRAINT "PreguntaTemporal_testId_fkey";

-- AlterTable
ALTER TABLE "Pregunta" ADD COLUMN     "deReserva" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "PreguntaReserva";

-- DropTable
DROP TABLE "PreguntaTemporal";
