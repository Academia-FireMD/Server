-- DropIndex
DROP INDEX "AsignacionAlumno_planificacionId_key";

-- CreateTable
CREATE TABLE "AlumnoProgresoSubBloque" (
    "id" SERIAL NOT NULL,
    "asignacionAlumnoId" INTEGER NOT NULL,
    "asignacionAlumnoAlumnoId" INTEGER NOT NULL,
    "subBloqueId" INTEGER NOT NULL,
    "realizado" BOOLEAN NOT NULL DEFAULT false,
    "comentariosAlumno" TEXT,
    "posicionPersonalizada" TIMESTAMP(3),

    CONSTRAINT "AlumnoProgresoSubBloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoPersonalizadoAlumno" (
    "id" SERIAL NOT NULL,
    "asignacionAlumnoId" INTEGER NOT NULL,
    "asignacionAlumnoAlumnoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "horaInicio" TIMESTAMP(3) NOT NULL,
    "duracion" INTEGER NOT NULL,
    "color" TEXT,
    "importante" BOOLEAN NOT NULL DEFAULT false,
    "tiempoAviso" INTEGER,
    "realizado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoPersonalizadoAlumno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlumnoProgresoSubBloque_asignacionAlumnoAlumnoId_asignacion_key" ON "AlumnoProgresoSubBloque"("asignacionAlumnoAlumnoId", "asignacionAlumnoId", "subBloqueId");

-- AddForeignKey
ALTER TABLE "AlumnoProgresoSubBloque" ADD CONSTRAINT "AlumnoProgresoSubBloque_asignacionAlumnoAlumnoId_asignacio_fkey" FOREIGN KEY ("asignacionAlumnoAlumnoId", "asignacionAlumnoId") REFERENCES "AsignacionAlumno"("alumnoId", "planificacionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoProgresoSubBloque" ADD CONSTRAINT "AlumnoProgresoSubBloque_subBloqueId_fkey" FOREIGN KEY ("subBloqueId") REFERENCES "SubBloque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoPersonalizadoAlumno" ADD CONSTRAINT "EventoPersonalizadoAlumno_asignacionAlumnoAlumnoId_asignac_fkey" FOREIGN KEY ("asignacionAlumnoAlumnoId", "asignacionAlumnoId") REFERENCES "AsignacionAlumno"("alumnoId", "planificacionId") ON DELETE CASCADE ON UPDATE CASCADE;
