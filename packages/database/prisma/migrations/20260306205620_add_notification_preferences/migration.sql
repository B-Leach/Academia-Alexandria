-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyBounty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyComments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyEndorsements" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPaperStatus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyReviews" BOOLEAN NOT NULL DEFAULT true;
