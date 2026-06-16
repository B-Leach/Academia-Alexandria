-- DropForeignKey
ALTER TABLE "co_author_invitations" DROP CONSTRAINT "co_author_invitations_inviteeId_fkey";

-- DropForeignKey
ALTER TABLE "co_author_invitations" DROP CONSTRAINT "co_author_invitations_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "endorsements" DROP CONSTRAINT "endorsements_endorserId_fkey";

-- DropForeignKey
ALTER TABLE "paper_authors" DROP CONSTRAINT "paper_authors_userId_fkey";

-- DropForeignKey
ALTER TABLE "reputation_events" DROP CONSTRAINT "reputation_events_userId_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_reviewerId_fkey";

-- DropIndex
DROP INDEX "papers_search_vector_idx";

-- AddForeignKey
ALTER TABLE "paper_authors" ADD CONSTRAINT "paper_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_author_invitations" ADD CONSTRAINT "co_author_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_author_invitations" ADD CONSTRAINT "co_author_invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate GIN index on search_vector (not managed by Prisma due to Unsupported type)
CREATE INDEX IF NOT EXISTS "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");
