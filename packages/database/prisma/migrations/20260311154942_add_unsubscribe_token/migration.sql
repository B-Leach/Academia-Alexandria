-- AlterTable
ALTER TABLE "users" ADD COLUMN     "unsubscribe_token" TEXT;

-- Recreate GIN index for full-text search (uses Unsupported type, invisible to Prisma)
CREATE INDEX IF NOT EXISTS "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");
