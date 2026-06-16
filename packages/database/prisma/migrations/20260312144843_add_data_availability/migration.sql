-- DropIndex
DROP INDEX "papers_search_vector_idx";

-- AlterTable
ALTER TABLE "paper_authors" ADD COLUMN     "contributions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "paper_versions" ADD COLUMN     "dataAvailability" TEXT;

-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "acceptanceEligibleAt" TIMESTAMP(3),
ADD COLUMN     "dataAvailability" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rorId" TEXT;
