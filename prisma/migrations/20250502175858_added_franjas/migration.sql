-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoDePlanificacionDeseada" ADD VALUE 'FRANJA_CUATRO_A_SEIS_HORAS';
ALTER TYPE "TipoDePlanificacionDeseada" ADD VALUE 'FRANJA_SEIS_A_OCHO_HORAS';
