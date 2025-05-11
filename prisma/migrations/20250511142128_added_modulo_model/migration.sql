-- AlterTable
ALTER TABLE "Tema" ADD COLUMN     "moduloId" INTEGER;

-- CreateTable
CREATE TABLE "Modulo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esPublico" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_nombre_key" ON "Modulo"("nombre");

-- CreateIndex
CREATE INDEX "Tema_moduloId_idx" ON "Tema"("moduloId");

-- AddForeignKey
ALTER TABLE "Tema" ADD CONSTRAINT "Tema_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
