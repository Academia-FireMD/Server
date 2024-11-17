-- AlterTable
ALTER TABLE "PlanificacionBloque" ADD COLUMN     "origenBloqueId" INTEGER;

-- AddForeignKey
ALTER TABLE "PlanificacionBloque" ADD CONSTRAINT "PlanificacionBloque_origenBloqueId_fkey" FOREIGN KEY ("origenBloqueId") REFERENCES "PlanificacionBloque"("id") ON DELETE SET NULL ON UPDATE CASCADE;
