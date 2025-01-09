-- DropForeignKey
ALTER TABLE "Respuesta" DROP CONSTRAINT "Respuesta_preguntaId_fkey";

-- AlterTable
ALTER TABLE "FlashcardData" ALTER COLUMN "dificultad" SET DEFAULT 'INTERMEDIO';

-- AlterTable
ALTER TABLE "Pregunta" ALTER COLUMN "dificultad" SET DEFAULT 'INTERMEDIO';

-- AddForeignKey
ALTER TABLE "Respuesta" ADD CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
