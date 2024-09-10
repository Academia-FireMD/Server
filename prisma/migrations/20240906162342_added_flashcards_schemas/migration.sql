-- CreateEnum
CREATE TYPE "EstadoFlashcard" AS ENUM ('BIEN', 'MAL', 'REVISAR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FactorName" ADD VALUE 'FLASHCARDS_MAL_PRIVOT';
ALTER TYPE "FactorName" ADD VALUE 'FLASHCARDS_REPASAR_PIVOT';

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "flashcardId" INTEGER;

-- AlterTable
ALTER TABLE "ReporteFallo" ADD COLUMN     "flashcardDataId" INTEGER;

-- CreateTable
CREATE TABLE "FlashcardTest" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "status" "TestStatus" NOT NULL DEFAULT 'CREADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardTestItem" (
    "id" SERIAL NOT NULL,
    "flashcardId" INTEGER NOT NULL,
    "testId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardTestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardRespuesta" (
    "id" SERIAL NOT NULL,
    "flashcardId" INTEGER NOT NULL,
    "testItemId" INTEGER NOT NULL,
    "estado" "EstadoFlashcard" NOT NULL DEFAULT 'REVISAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardData" (
    "id" SERIAL NOT NULL,
    "identificador" TEXT NOT NULL,
    "relevancia" "Comunidad"[],
    "dificultad" "Dificultad" NOT NULL,
    "temaId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "solucion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardData_identificador_key" ON "FlashcardData"("identificador");

-- AddForeignKey
ALTER TABLE "FlashcardTest" ADD CONSTRAINT "FlashcardTest_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardTestItem" ADD CONSTRAINT "FlashcardTestItem_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "FlashcardData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardTestItem" ADD CONSTRAINT "FlashcardTestItem_testId_fkey" FOREIGN KEY ("testId") REFERENCES "FlashcardTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardRespuesta" ADD CONSTRAINT "FlashcardRespuesta_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "FlashcardData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardRespuesta" ADD CONSTRAINT "FlashcardRespuesta_testItemId_fkey" FOREIGN KEY ("testItemId") REFERENCES "FlashcardTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardData" ADD CONSTRAINT "FlashcardData_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "FlashcardData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteFallo" ADD CONSTRAINT "ReporteFallo_flashcardDataId_fkey" FOREIGN KEY ("flashcardDataId") REFERENCES "FlashcardData"("id") ON DELETE SET NULL ON UPDATE CASCADE;
