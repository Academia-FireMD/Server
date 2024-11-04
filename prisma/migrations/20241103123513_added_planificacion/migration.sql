-- CreateTable
CREATE TABLE "PlanificacionBloque" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "diaSemanaId" INTEGER,
    "planificacionMensualId" INTEGER,

    CONSTRAINT "PlanificacionBloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubBloque" (
    "id" SERIAL NOT NULL,
    "horaInicio" TIMESTAMP(3) NOT NULL,
    "duracion" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "temaId" INTEGER,
    "comentarios" TEXT,
    "bloqueId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubBloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaSemanal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaSemanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaSemana" (
    "id" SERIAL NOT NULL,
    "dia" TEXT NOT NULL,
    "plantillaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiaSemana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanificacionMensual" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanificacionMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanificacionMensualPlantilla" (
    "plantillaId" INTEGER NOT NULL,
    "planificacionId" INTEGER NOT NULL,

    CONSTRAINT "PlanificacionMensualPlantilla_pkey" PRIMARY KEY ("plantillaId","planificacionId")
);

-- CreateTable
CREATE TABLE "AsignacionAlumno" (
    "alumnoId" INTEGER NOT NULL,
    "planificacionId" INTEGER NOT NULL,

    CONSTRAINT "AsignacionAlumno_pkey" PRIMARY KEY ("alumnoId","planificacionId")
);

-- AddForeignKey
ALTER TABLE "PlanificacionBloque" ADD CONSTRAINT "PlanificacionBloque_diaSemanaId_fkey" FOREIGN KEY ("diaSemanaId") REFERENCES "DiaSemana"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanificacionBloque" ADD CONSTRAINT "PlanificacionBloque_planificacionMensualId_fkey" FOREIGN KEY ("planificacionMensualId") REFERENCES "PlanificacionMensual"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubBloque" ADD CONSTRAINT "SubBloque_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "Tema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubBloque" ADD CONSTRAINT "SubBloque_bloqueId_fkey" FOREIGN KEY ("bloqueId") REFERENCES "PlanificacionBloque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaSemana" ADD CONSTRAINT "DiaSemana_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaSemanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanificacionMensualPlantilla" ADD CONSTRAINT "PlanificacionMensualPlantilla_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "PlantillaSemanal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanificacionMensualPlantilla" ADD CONSTRAINT "PlanificacionMensualPlantilla_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "PlanificacionMensual"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAlumno" ADD CONSTRAINT "AsignacionAlumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionAlumno" ADD CONSTRAINT "AsignacionAlumno_planificacionId_fkey" FOREIGN KEY ("planificacionId") REFERENCES "PlanificacionMensual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
