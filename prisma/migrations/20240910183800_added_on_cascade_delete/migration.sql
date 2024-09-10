-- DropForeignKey
ALTER TABLE "FlashcardRespuesta" DROP CONSTRAINT "FlashcardRespuesta_testItemId_fkey";

-- DropForeignKey
ALTER TABLE "FlashcardTest" DROP CONSTRAINT "FlashcardTest_realizadorId_fkey";

-- AddForeignKey
ALTER TABLE "FlashcardTest" ADD CONSTRAINT "FlashcardTest_realizadorId_fkey" FOREIGN KEY ("realizadorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardRespuesta" ADD CONSTRAINT "FlashcardRespuesta_testItemId_fkey" FOREIGN KEY ("testItemId") REFERENCES "FlashcardTestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
