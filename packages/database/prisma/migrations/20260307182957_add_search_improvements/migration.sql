-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- Full-text search: tsvector column maintained by trigger
ALTER TABLE "papers" ADD COLUMN "search_vector" tsvector;

-- GIN index for fast full-text search
CREATE INDEX "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");

-- Function to update search_vector from title, abstract, and keywords
CREATE OR REPLACE FUNCTION papers_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.keywords, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search_vector in sync on insert/update
CREATE TRIGGER papers_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "abstract", "keywords"
  ON "papers"
  FOR EACH ROW
  EXECUTE FUNCTION papers_search_vector_update();

-- Backfill search_vector for existing rows
UPDATE "papers" SET "search_vector" =
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("abstract", '')), 'B') ||
  setweight(to_tsvector('english', coalesce(array_to_string("keywords", ' '), '')), 'C');
