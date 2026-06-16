-- Prisma auto-generated a DROP INDEX here because it doesn't manage the GIN index.
-- We override this to recreate the index instead, ensuring full-text search works.
-- The index was originally dropped in the add_admin_roles migration.
CREATE INDEX IF NOT EXISTS "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");
