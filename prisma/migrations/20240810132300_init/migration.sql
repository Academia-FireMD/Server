-- CreateEnum
CREATE TYPE "Comunidad" AS ENUM ('MADRID', 'VALENCIA', 'MURCIA');

-- CreateEnum
CREATE TYPE "Dificultad" AS ENUM ('BASICO', 'INTERMEDIO', 'DIFICIL');

-- CreateEnum
CREATE TYPE "SeguridadAlResponder" AS ENUM ('CINCUENTA_POR_CIENTO', 'SETENTA_Y_CINCO_POR_CIENTO', 'CIEN_POR_CIENTO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'ALUMNO');

-- CreateTable
CREATE TABLE "Test" (
    "id" SERIAL NOT NULL,
    "realizadorId" INTEGER NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" SERIAL NOT NULL,
    "identificador" TEXT NOT NULL,
    "relevancia" "Comunidad"[],
    "dificultad" "Dificultad" NOT NULL,
    "tema" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "solucion" TEXT NOT NULL,
    "respuestas" TEXT[],
    "respuestaCorrectaIndex" INTEGER NOT NULL,
    "seguridad" "SeguridadAlResponder" NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "contrasenya" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PreguntaToTest" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Pregunta_identificador_key" ON "Pregunta"("identificador");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_PreguntaToTest_AB_unique" ON "_PreguntaToTest"("A", "B");

-- CreateIndex
CREATE INDEX "_PreguntaToTest_B_index" ON "_PreguntaToTest"("B");

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_realizadorId_fkey" FOREIGN KEY ("realizadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PreguntaToTest" ADD CONSTRAINT "_PreguntaToTest_A_fkey" FOREIGN KEY ("A") REFERENCES "Pregunta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PreguntaToTest" ADD CONSTRAINT "_PreguntaToTest_B_fkey" FOREIGN KEY ("B") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;
