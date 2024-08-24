-- DropForeignKey
ALTER TABLE "Respuesta" DROP CONSTRAINT "Respuesta_testId_fkey";

-- DropForeignKey
ALTER TABLE "TestPregunta" DROP CONSTRAINT "TestPregunta_testId_fkey";

-- AddForeignKey
ALTER TABLE "TestPregunta" ADD CONSTRAINT "TestPregunta_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
