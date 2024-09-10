-- CreateEnum
CREATE TYPE "EstadoPregunta" AS ENUM ('NO_RESPONDIDA', 'RESPONDIDA', 'OMITIDA');

-- AlterTable
ALTER TABLE "TestPregunta" ADD COLUMN     "estado" "EstadoPregunta" NOT NULL DEFAULT 'NO_RESPONDIDA';
