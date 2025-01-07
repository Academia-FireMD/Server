/*
  Warnings:

  - You are about to drop the column `nombre` on the `Documento` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[identificador]` on the table `Documento` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identificador` to the `Documento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Documento" DROP COLUMN "nombre",
ADD COLUMN     "identificador" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Documento_identificador_key" ON "Documento"("identificador");
