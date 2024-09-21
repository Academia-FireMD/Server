-- DropForeignKey
ALTER TABLE "FlashcardData" DROP CONSTRAINT "FlashcardData_temaId_fkey";

-- DropForeignKey
ALTER TABLE "Pregunta" DROP CONSTRAINT "Pregunta_temaId_fkey";

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardData" ADD CONSTRAINT "FlashcardData_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE CASCADE ON UPDATE CASCADE;
