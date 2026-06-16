-- CreateIndex
CREATE INDEX "papers_reviewCount_idx" ON "papers"("reviewCount");

-- CreateIndex
CREATE INDEX "papers_endorsementCount_idx" ON "papers"("endorsementCount");

-- CreateIndex
CREATE INDEX "papers_commentCount_idx" ON "papers"("commentCount");
