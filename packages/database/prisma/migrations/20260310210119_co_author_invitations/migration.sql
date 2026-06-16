-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyInvitations" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "co_author_invitations" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "co_author_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "co_author_invitations_inviteeId_status_idx" ON "co_author_invitations"("inviteeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "co_author_invitations_paperId_inviteeId_key" ON "co_author_invitations"("paperId", "inviteeId");

-- AddForeignKey
ALTER TABLE "co_author_invitations" ADD CONSTRAINT "co_author_invitations_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_author_invitations" ADD CONSTRAINT "co_author_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "co_author_invitations" ADD CONSTRAINT "co_author_invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate GIN index on search_vector (not managed by Prisma due to Unsupported type)
CREATE INDEX IF NOT EXISTS "papers_search_vector_idx" ON "papers" USING GIN ("search_vector");
