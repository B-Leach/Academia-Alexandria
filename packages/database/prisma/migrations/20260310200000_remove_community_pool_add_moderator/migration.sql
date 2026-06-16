-- AlterEnum: Add MODERATOR to UserRole
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- AlterEnum: Remove COMMUNITY_FUNDED from BountyStatus
-- First update any rows that use it (safety), then recreate the enum
UPDATE "bounties" SET "status" = 'EXPIRED' WHERE "status" = 'COMMUNITY_FUNDED';

CREATE TYPE "BountyStatus_new" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');
ALTER TABLE "bounties" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "bounties" ALTER COLUMN "status" TYPE "BountyStatus_new" USING ("status"::text::"BountyStatus_new");
ALTER TYPE "BountyStatus" RENAME TO "BountyStatus_old";
ALTER TYPE "BountyStatus_new" RENAME TO "BountyStatus";
DROP TYPE "BountyStatus_old";
ALTER TABLE "bounties" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable: Remove community pool columns from bounties
ALTER TABLE "bounties" DROP COLUMN "communityPoolCents";
ALTER TABLE "bounties" DROP COLUMN "isCommunitySponsored";

-- DropTable: community_pool_transactions (must drop first due to FK)
DROP TABLE "community_pool_transactions";

-- DropTable: community_pool
DROP TABLE "community_pool";
