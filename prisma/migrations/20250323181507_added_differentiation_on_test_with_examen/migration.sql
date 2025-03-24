-- DropForeignKey
ALTER TABLE "Examen" DROP CONSTRAINT "Examen_testId_fkey";

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "examenId" INTEGER;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_examenId_fkey" FOREIGN KEY ("examenId") REFERENCES "Examen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examen" ADD CONSTRAINT "Examen_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
