/*
  Warnings:

  - The values [TRAINING,EXAM] on the enum `SuscripcionTipo` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SuscripcionTipo_new" AS ENUM ('PRO', 'NORMAL', 'INDIVIDUAL', 'PREMIUM', 'ADVANCED', 'BASIC');
ALTER TABLE "Suscripcion" ALTER COLUMN "tipo" TYPE "SuscripcionTipo_new" USING ("tipo"::text::"SuscripcionTipo_new");
ALTER TYPE "SuscripcionTipo" RENAME TO "SuscripcionTipo_old";
ALTER TYPE "SuscripcionTipo_new" RENAME TO "SuscripcionTipo";
DROP TYPE "SuscripcionTipo_old";
COMMIT;
