-- AlterTable
ALTER TABLE "Pregunta" ADD COLUMN     "esDeRepaso" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "esDeRepaso" BOOLEAN NOT NULL DEFAULT false;
