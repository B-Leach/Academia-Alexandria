-- AlterTable
ALTER TABLE "endorsements" ADD COLUMN     "conflictOfInterest" TEXT;

-- AlterTable
ALTER TABLE "paper_versions" ADD COLUMN     "authors" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "funding" TEXT,
ADD COLUMN     "license" TEXT;

-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "funding" TEXT,
ADD COLUMN     "license" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "conflictOfInterest" TEXT;

-- CreateIndex
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");

-- CreateIndex
CREATE INDEX "endorsements_endorserId_idx" ON "endorsements"("endorserId");

-- CreateIndex
CREATE INDEX "paper_authors_userId_idx" ON "paper_authors"("userId");

-- CreateIndex
CREATE INDEX "papers_viewCount_idx" ON "papers"("viewCount");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- AddForeignKey
ALTER TABLE "bounty_payouts" ADD CONSTRAINT "bounty_payouts_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
