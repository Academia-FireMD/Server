-- CreateTable
CREATE TABLE "RegistroTemporal" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "apellidos" TEXT,
    "woocommerceCustomerId" TEXT NOT NULL,
    "planType" "SuscripcionTipo" NOT NULL,
    "sku" TEXT,
    "productId" TEXT,
    "monthlyPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RegistroTemporal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistroTemporal_token_key" ON "RegistroTemporal"("token");
