/*
  Warnings:

  - You are about to drop the column `origenBloqueId` on the `PlanificacionBloque` table. All the data in the column will be lost.
  - You are about to drop the column `planificacionMensualId` on the `PlanificacionBloque` table. All the data in the column will be lost.
  - You are about to drop the `PlanificacionMensualPlantilla` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlanificacionBloque" DROP CONSTRAINT "PlanificacionBloque_origenBloqueId_fkey";

-- DropForeignKey
ALTER TABLE "PlanificacionBloque" DROP CONSTRAINT "PlanificacionBloque_planificacionMensualId_fkey";

-- DropForeignKey
ALTER TABLE "PlanificacionMensualPlantilla" DROP CONSTRAINT "PlanificacionMensualPlantilla_planificacionId_fkey";

-- DropForeignKey
ALTER TABLE "PlanificacionMensualPlantilla" DROP CONSTRAINT "PlanificacionMensualPlantilla_plantillaId_fkey";

-- AlterTable
ALTER TABLE "PlanificacionBloque" DROP COLUMN "origenBloqueId",
DROP COLUMN "planificacionMensualId";

-- AlterTable
ALTER TABLE "SubBloque" ADD COLUMN     "planificacionId" INTEGER;

-- DropTable
DROP TABLE "PlanificacionMensualPlantilla";

-- AddForeignKey
ALTER TABLE "SubBloque" ADD CONSTRAINT "SubBloque_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "PlanificacionMensual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
