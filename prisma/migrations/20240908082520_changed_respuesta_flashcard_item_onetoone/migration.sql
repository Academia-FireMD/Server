/*
  Warnings:

  - A unique constraint covering the columns `[testItemId]` on the table `FlashcardRespuesta` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FlashcardRespuesta" DROP CONSTRAINT "FlashcardRespuesta_testItemId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardRespuesta_testItemId_key" ON "FlashcardRespuesta"("testItemId");

-- AddForeignKey
ALTER TABLE "FlashcardRespuesta" ADD CONSTRAINT "FlashcardRespuesta_testItemId_fkey" FOREIGN KEY ("testItemId") REFERENCES "FlashcardTestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
