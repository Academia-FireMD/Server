/*
  Warnings:

  - Added the required column `numero` to the `Tema` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tema" ADD COLUMN     "numero" INTEGER NOT NULL;
