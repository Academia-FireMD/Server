/*
  Warnings:

  - Changed the type of `tipo` on the `Suscripcion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SuscripcionTipo" AS ENUM ('PRO', 'NORMAL', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "Suscripcion" DROP COLUMN "tipo",
ADD COLUMN     "tipo" "SuscripcionTipo" NOT NULL;
