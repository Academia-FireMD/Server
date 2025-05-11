-- DropForeignKey
ALTER TABLE "Tema" DROP CONSTRAINT "Tema_moduloId_fkey";

-- AddForeignKey
ALTER TABLE "Tema" ADD CONSTRAINT "Tema_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
