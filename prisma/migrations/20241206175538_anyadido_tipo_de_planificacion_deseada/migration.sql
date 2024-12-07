-- CreateEnum
CREATE TYPE "TipoDePlanificacionDeseada" AS ENUM ('CUATRO_HORAS', 'SEIS_HORAS', 'OCHO_HORAS');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "tipoDePlanificacionDuracionDeseada" "TipoDePlanificacionDeseada" NOT NULL DEFAULT 'SEIS_HORAS';
