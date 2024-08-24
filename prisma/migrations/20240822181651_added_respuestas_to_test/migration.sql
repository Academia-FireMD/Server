-- CreateTable
CREATE TABLE "Respuesta" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "respuestaDada" INTEGER NOT NULL,
    "esCorrecta" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Respuesta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
