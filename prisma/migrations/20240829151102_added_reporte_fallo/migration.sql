-- CreateTable
CREATE TABLE "ReporteFallo" (
    "id" SERIAL NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReporteFallo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReporteFallo" ADD CONSTRAINT "ReporteFallo_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReporteFallo" ADD CONSTRAINT "ReporteFallo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
