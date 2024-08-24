/*
  Warnings:

  - You are about to drop the `_PreguntaToTest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_PreguntaToTest" DROP CONSTRAINT "_PreguntaToTest_A_fkey";

-- DropForeignKey
ALTER TABLE "_PreguntaToTest" DROP CONSTRAINT "_PreguntaToTest_B_fkey";

-- DropTable
DROP TABLE "_PreguntaToTest";

-- CreateTable
CREATE TABLE "TestPregunta" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "preguntaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestPregunta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TestPregunta" ADD CONSTRAINT "TestPregunta_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPregunta" ADD CONSTRAINT "TestPregunta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
