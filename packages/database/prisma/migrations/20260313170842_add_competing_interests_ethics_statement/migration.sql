-- AlterTable
ALTER TABLE "paper_versions" ADD COLUMN     "competingInterests" TEXT,
ADD COLUMN     "ethicsStatement" TEXT;

-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "competingInterests" TEXT,
ADD COLUMN     "ethicsStatement" TEXT;
