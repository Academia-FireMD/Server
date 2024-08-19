-- CreateEnum
CREATE TYPE "FactorName" AS ENUM ('PREGUNTAS_MALAS_PIVOT');

-- CreateTable
CREATE TABLE "Factor" (
    "id" "FactorName" NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "Factor_pkey" PRIMARY KEY ("id")
);
