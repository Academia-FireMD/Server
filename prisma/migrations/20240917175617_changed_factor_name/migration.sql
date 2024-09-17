/*
  Warnings:

  - The values [FLASCARDS_BALANCE_NO_RESPONDIDAS] on the enum `FactorName` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FactorName_new" AS ENUM ('PREGUNTAS_MALAS_PIVOT', 'FLASHCARDS_MAL_PRIVOT', 'FLASHCARDS_REPASAR_PIVOT', 'FLASHCARDS_BALANCE_NO_RESPONDIDAS', 'FLASHCARDS_BALANCE_MAL', 'FLASHCARDS_BALANCE_REVISAR', 'FLASHCARDS_BALANCE_BIEN');
ALTER TABLE "Factor" ALTER COLUMN "id" TYPE "FactorName_new" USING ("id"::text::"FactorName_new");
ALTER TYPE "FactorName" RENAME TO "FactorName_old";
ALTER TYPE "FactorName_new" RENAME TO "FactorName";
DROP TYPE "FactorName_old";
COMMIT;
