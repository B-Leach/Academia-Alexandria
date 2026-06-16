-- CreateTable
CREATE TABLE "paper_versions" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "content" TEXT,
    "pdfUrl" TEXT,
    "keywords" TEXT[],
    "disciplines" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paper_versions_paperId_version_key" ON "paper_versions"("paperId", "version");

-- AddForeignKey
ALTER TABLE "paper_versions" ADD CONSTRAINT "paper_versions_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
