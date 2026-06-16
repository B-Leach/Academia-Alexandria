-- Step 1: Add SUBMITTED to PaperStatus enum
ALTER TYPE "PaperStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';

-- Step 2: Replace ReviewRecommendation enum values
-- First, delete any existing reviews (dev only, no production data)
DELETE FROM "reviews";

-- Drop the old enum and create new one
ALTER TABLE "reviews" ALTER COLUMN "recommendation" TYPE TEXT;
DROP TYPE "ReviewRecommendation";
CREATE TYPE "ReviewRecommendation" AS ENUM ('SOUND', 'NEEDS_REVISION', 'UNSOUND');
ALTER TABLE "reviews" ALTER COLUMN "recommendation" TYPE "ReviewRecommendation" USING "recommendation"::"ReviewRecommendation";

-- Step 3: Replace ReputationEventType enum values
-- First, delete events with old types that no longer exist
DELETE FROM "reputation_events" WHERE "type" IN ('PAPER_PUBLISHED', 'REVIEW_WRITTEN', 'REVIEW_HELPFUL_VOTE');

-- Update the enum
ALTER TABLE "reputation_events" ALTER COLUMN "type" TYPE TEXT;
DROP TYPE "ReputationEventType";
CREATE TYPE "ReputationEventType" AS ENUM ('PAPER_ACCEPTED', 'REVIEW_SUBMITTED', 'ENDORSEMENT_RECEIVED', 'ENDORSEMENT_GIVEN', 'BOUNTY_REVIEW_COMPLETED', 'PAPER_ENDORSED_BY_TRUSTED');
ALTER TABLE "reputation_events" ALTER COLUMN "type" TYPE "ReputationEventType" USING "type"::"ReputationEventType";
