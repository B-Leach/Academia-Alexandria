-- Recreate GIN index on search_vector (dropped in add_admin_roles migration)
CREATE INDEX "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");
