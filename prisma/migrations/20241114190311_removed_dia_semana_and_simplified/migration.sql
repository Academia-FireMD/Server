/*
  Warnings:

  - You are about to drop the column `diaSemanaId` on the `PlanificacionBloque` table. All the data in the column will be lost.
  - You are about to drop the `DiaSemana` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiaSemana" DROP CONSTRAINT "DiaSemana_plantillaId_fkey";

-- DropForeignKey
ALTER TABLE "PlanificacionBloque" DROP CONSTRAINT "PlanificacionBloque_diaSemanaId_fkey";

-- AlterTable
ALTER TABLE "PlanificacionBloque" DROP COLUMN "diaSemanaId";

-- AlterTable
ALTER TABLE "PlantillaSemanal" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SubBloque" ADD COLUMN     "plantillaId" INTEGER,
ALTER COLUMN "bloqueId" DROP NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "DiaSemana";

-- AddForeignKey
ALTER TABLE "SubBloque" ADD CONSTRAINT "SubBloque_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaSemanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
