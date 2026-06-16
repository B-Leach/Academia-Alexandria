-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- DropIndex
DROP INDEX "papers_search_vector_idx";

-- AlterTable
ALTER TABLE "papers" ADD COLUMN     "retractedAt" TIMESTAMP(3),
ADD COLUMN     "retractedById" TEXT,
ADD COLUMN     "retractedReason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bannedAt" TIMESTAMP(3),
ADD COLUMN     "bannedReason" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_retractedById_fkey" FOREIGN KEY ("retractedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
