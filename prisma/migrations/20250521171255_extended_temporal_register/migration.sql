-- AlterTable
ALTER TABLE "RegistroTemporal" ADD COLUMN     "isOfferPlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offerDuration" INTEGER,
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionInterval" TEXT,
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" TEXT;
