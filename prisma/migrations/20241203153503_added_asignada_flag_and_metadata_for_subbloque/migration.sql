-- AlterTable
ALTER TABLE "PlanificacionMensual" ADD COLUMN     "asignada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SubBloque" ADD COLUMN     "comentariosAlumno" TEXT,
ADD COLUMN     "realizado" BOOLEAN NOT NULL DEFAULT false;
