/*
  Warnings:

  - Changed the type of `dia` on the `DiaSemana` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "DiaSemana" DROP COLUMN "dia",
ADD COLUMN     "dia" INTEGER NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
