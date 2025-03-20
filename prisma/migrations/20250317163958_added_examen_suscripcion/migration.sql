-- CreateEnum
CREATE TYPE "EstadoExamen" AS ENUM ('BORRADOR', 'PUBLICADO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoAcceso" AS ENUM ('PUBLICO', 'RESTRINGIDO', 'SIMULACRO');

-- CreateTable
CREATE TABLE "Examen" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoExamen" NOT NULL DEFAULT 'BORRADOR',
    "tipoAcceso" "TipoAcceso" NOT NULL DEFAULT 'PUBLICO',
    "codigoAcceso" TEXT,
    "fechaActivacion" TIMESTAMP(3),
    "fechaSolucion" TIMESTAMP(3),
    "relevancia" "Comunidad"[],
    "consideracionesGenerales" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Examen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreguntaReserva" (
    "id" SERIAL NOT NULL,
    "examenId" INTEGER NOT NULL,
    "testPreguntaId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "PreguntaReserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreguntaTemporal" (
    "id" SERIAL NOT NULL,
    "testId" INTEGER NOT NULL,
    "identificador" TEXT NOT NULL,
    "relevancia" "Comunidad"[],
    "dificultad" "Dificultad" NOT NULL DEFAULT 'INTERMEDIO',
    "temaId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "solucion" TEXT NOT NULL,
    "respuestas" TEXT[],
    "respuestaCorrectaIndex" INTEGER NOT NULL,
    "seguridad" "SeguridadAlResponder" DEFAULT 'CIEN_POR_CIENTO',
    "agregadaABaseDeDatos" BOOLEAN NOT NULL DEFAULT false,
    "preguntaRealId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreguntaTemporal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "examenId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioExterno" (
    "id" SERIAL NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "testId" INTEGER NOT NULL,
    "codigoAcceso" TEXT NOT NULL,
    "fechaAcceso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaExpiracion" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioExterno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Examen_testId_key" ON "Examen"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "PreguntaReserva_examenId_testPreguntaId_key" ON "PreguntaReserva"("examenId", "testPreguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_usuarioId_key" ON "Suscripcion"("usuarioId");

-- AddForeignKey
ALTER TABLE "Examen" ADD CONSTRAINT "Examen_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examen" ADD CONSTRAINT "Examen_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreguntaReserva" ADD CONSTRAINT "PreguntaReserva_examenId_fkey" FOREIGN KEY ("examenId") REFERENCES "Examen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreguntaReserva" ADD CONSTRAINT "PreguntaReserva_testPreguntaId_fkey" FOREIGN KEY ("testPreguntaId") REFERENCES "TestPregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreguntaTemporal" ADD CONSTRAINT "PreguntaTemporal_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
