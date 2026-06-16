-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "plagiarismCheckId" TEXT,
ADD COLUMN     "plagiarismScore" DOUBLE PRECISION,
ADD COLUMN     "plagiarismStatus" TEXT,
ADD COLUMN     "similarityPaperId" TEXT,
ADD COLUMN     "similarityScore" DOUBLE PRECISION;
