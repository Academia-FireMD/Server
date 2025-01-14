-- DropForeignKey
ALTER TABLE "TestPregunta" DROP CONSTRAINT "TestPregunta_preguntaId_fkey";

-- AddForeignKey
ALTER TABLE "TestPregunta" ADD CONSTRAINT "TestPregunta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
