-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "esTutor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tutorId" INTEGER;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
