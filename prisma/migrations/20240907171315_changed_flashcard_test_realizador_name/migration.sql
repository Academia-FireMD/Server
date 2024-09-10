/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `FlashcardTest` table. All the data in the column will be lost.
  - Added the required column `realizadorId` to the `FlashcardTest` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FlashcardTest" DROP CONSTRAINT "FlashcardTest_usuarioId_fkey";

-- AlterTable
ALTER TABLE "FlashcardTest" DROP COLUMN "usuarioId",
ADD COLUMN     "realizadorId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "FlashcardTest" ADD CONSTRAINT "FlashcardTest_realizadorId_fkey" FOREIGN KEY ("realizadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
