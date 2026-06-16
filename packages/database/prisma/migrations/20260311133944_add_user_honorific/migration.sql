-- DropIndex
DROP INDEX "papers_search_vector_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "honorific" TEXT;

-- Recreate GIN index on search_vector (not managed by Prisma due to Unsupported type)
CREATE INDEX IF NOT EXISTS "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");
