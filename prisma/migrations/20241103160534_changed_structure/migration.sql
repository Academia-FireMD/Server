/*
  Warnings:

  - You are about to drop the column `nombre` on the `PlanificacionBloque` table. All the data in the column will be lost.
  - You are about to drop the column `temaId` on the `SubBloque` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `SubBloque` table. All the data in the column will be lost.
  - Added the required column `identificador` to the `PlanificacionBloque` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombre` to the `SubBloque` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SubBloque" DROP CONSTRAINT "SubBloque_temaId_fkey";

-- AlterTable
ALTER TABLE "PlanificacionBloque" DROP COLUMN "nombre",
ADD COLUMN     "identificador" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubBloque" DROP COLUMN "temaId",
DROP COLUMN "tipo",
ADD COLUMN     "nombre" TEXT NOT NULL;
