/*
  Warnings:

  - You are about to drop the column `estado` on the `TestPregunta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Respuesta" ADD COLUMN     "estado" "EstadoPregunta" NOT NULL DEFAULT 'NO_RESPONDIDA';

-- AlterTable
ALTER TABLE "TestPregunta" DROP COLUMN "estado";
