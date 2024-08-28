/*
  Warnings:

  - You are about to drop the column `tema` on the `Pregunta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Pregunta" DROP COLUMN "tema",
ADD COLUMN     "temaId" INTEGER;

-- CreateTable
CREATE TABLE "Tema" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,

    CONSTRAINT "Tema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tema_nombre_key" ON "Tema"("nombre");

-- AddForeignKey
ALTER TABLE "Pregunta" ADD CONSTRAINT "Pregunta_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
