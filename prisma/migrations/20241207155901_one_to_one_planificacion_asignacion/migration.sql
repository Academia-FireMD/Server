/*
  Warnings:

  - A unique constraint covering the columns `[planificacionId]` on the table `AsignacionAlumno` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AsignacionAlumno_planificacionId_key" ON "AsignacionAlumno"("planificacionId");
