-- AlterTable
ALTER TABLE "PlanificacionMensual" ADD COLUMN     "esPorDefecto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "relevancia" "Comunidad"[];
