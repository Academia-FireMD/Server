-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('CREADO', 'EMPEZADO', 'FINALIZADO');

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "status" "TestStatus" NOT NULL DEFAULT 'CREADO';
