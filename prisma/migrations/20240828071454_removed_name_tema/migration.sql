/*
  Warnings:

  - You are about to drop the column `nombre` on the `Tema` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Tema_nombre_key";

-- AlterTable
ALTER TABLE "Tema" DROP COLUMN "nombre";
