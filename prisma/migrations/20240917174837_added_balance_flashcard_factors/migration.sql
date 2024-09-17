-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FactorName" ADD VALUE 'FLASCARDS_BALANCE_NO_RESPONDIDAS';
ALTER TYPE "FactorName" ADD VALUE 'FLASHCARDS_BALANCE_MAL';
ALTER TYPE "FactorName" ADD VALUE 'FLASHCARDS_BALANCE_REVISAR';
ALTER TYPE "FactorName" ADD VALUE 'FLASHCARDS_BALANCE_BIEN';
