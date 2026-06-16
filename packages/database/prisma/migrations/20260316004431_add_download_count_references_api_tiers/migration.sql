-- CreateEnum
CREATE TYPE "ApiKeyTier" AS ENUM ('FREE', 'BASIC', 'PREMIUM');

-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN     "tier" "ApiKeyTier" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "references" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "citedPaperId" TEXT,
    "raw" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "year" INTEGER,
    "doi" TEXT,
    "url" TEXT,
    "journal" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "references_paperId_idx" ON "references"("paperId");

-- CreateIndex
CREATE INDEX "references_citedPaperId_idx" ON "references"("citedPaperId");

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "references" ADD CONSTRAINT "references_citedPaperId_fkey" FOREIGN KEY ("citedPaperId") REFERENCES "papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
