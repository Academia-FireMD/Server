/*
  Warnings:

  - You are about to drop the column `nombre` on the `PlantillaSemanal` table. All the data in the column will be lost.
  - Added the required column `identificador` to the `PlantillaSemanal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlantillaSemanal" DROP COLUMN "nombre",
ADD COLUMN     "identificador" TEXT NOT NULL;
