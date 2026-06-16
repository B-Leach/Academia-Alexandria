-- CreateEnum
CREATE TYPE "PaperStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETRACTED');

-- CreateEnum
CREATE TYPE "ReviewRecommendation" AS ENUM ('STRONG_ACCEPT', 'ACCEPT', 'WEAK_ACCEPT', 'NEUTRAL', 'WEAK_REJECT', 'REJECT', 'STRONG_REJECT');

-- CreateEnum
CREATE TYPE "BountyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'COMMUNITY_FUNDED');

-- CreateEnum
CREATE TYPE "ReputationEventType" AS ENUM ('PAPER_PUBLISHED', 'REVIEW_WRITTEN', 'REVIEW_HELPFUL_VOTE', 'ENDORSEMENT_RECEIVED', 'ENDORSEMENT_GIVEN', 'BOUNTY_REVIEW_COMPLETED', 'PAPER_ENDORSED_BY_TRUSTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "institution" TEXT,
    "avatarUrl" TEXT,
    "orcidId" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeConnectAccountId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "research_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "research_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_research_areas" (
    "userId" TEXT NOT NULL,
    "researchAreaId" TEXT NOT NULL,

    CONSTRAINT "user_research_areas_pkey" PRIMARY KEY ("userId","researchAreaId")
);

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "content" TEXT,
    "status" "PaperStatus" NOT NULL DEFAULT 'DRAFT',
    "keywords" TEXT[],
    "discipline" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "doi" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "endorsementCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_authors" (
    "paperId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCorresponding" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "paper_authors_pkey" PRIMARY KEY ("paperId","userId")
);

-- CreateTable
CREATE TABLE "paper_research_areas" (
    "paperId" TEXT NOT NULL,
    "researchAreaId" TEXT NOT NULL,

    CONSTRAINT "paper_research_areas_pkey" PRIMARY KEY ("paperId","researchAreaId")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "methodologyScore" INTEGER NOT NULL,
    "noveltyScore" INTEGER NOT NULL,
    "clarityScore" INTEGER NOT NULL,
    "reproducibilityScore" INTEGER NOT NULL,
    "ethicsScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "strengthsText" TEXT NOT NULL,
    "weaknessesText" TEXT NOT NULL,
    "detailedComments" TEXT NOT NULL,
    "recommendation" "ReviewRecommendation" NOT NULL,
    "confidenceLevel" INTEGER NOT NULL,
    "paperId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "bountyPayoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsements" (
    "id" TEXT NOT NULL,
    "statement" TEXT,
    "paperId" TEXT NOT NULL,
    "endorserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounties" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "reviewerPoolCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "communityPoolCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "BountyStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripePaymentIntentId" TEXT,
    "isCommunitySponsored" BOOLEAN NOT NULL DEFAULT false,
    "maxReviews" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "bounties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bounty_payouts" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bounty_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_pool" (
    "id" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_pool_transactions" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "relatedBountyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_pool_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reputation_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReputationEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "sourcePaperId" TEXT,
    "sourceReviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_orcidId_key" ON "users"("orcidId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "research_areas_name_key" ON "research_areas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "research_areas_slug_key" ON "research_areas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "papers_doi_key" ON "papers"("doi");

-- CreateIndex
CREATE INDEX "papers_status_publishedAt_idx" ON "papers"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "papers_discipline_idx" ON "papers"("discipline");

-- CreateIndex
CREATE INDEX "comments_paperId_createdAt_idx" ON "comments"("paperId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bountyPayoutId_key" ON "reviews"("bountyPayoutId");

-- CreateIndex
CREATE INDEX "reviews_paperId_createdAt_idx" ON "reviews"("paperId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_paperId_reviewerId_key" ON "reviews"("paperId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "endorsements_paperId_endorserId_key" ON "endorsements"("paperId", "endorserId");

-- CreateIndex
CREATE UNIQUE INDEX "bounties_paperId_key" ON "bounties"("paperId");

-- CreateIndex
CREATE INDEX "reputation_events_userId_createdAt_idx" ON "reputation_events"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_areas" ADD CONSTRAINT "research_areas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "research_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_research_areas" ADD CONSTRAINT "user_research_areas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_research_areas" ADD CONSTRAINT "user_research_areas_researchAreaId_fkey" FOREIGN KEY ("researchAreaId") REFERENCES "research_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_authors" ADD CONSTRAINT "paper_authors_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_authors" ADD CONSTRAINT "paper_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_research_areas" ADD CONSTRAINT "paper_research_areas_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_research_areas" ADD CONSTRAINT "paper_research_areas_researchAreaId_fkey" FOREIGN KEY ("researchAreaId") REFERENCES "research_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bountyPayoutId_fkey" FOREIGN KEY ("bountyPayoutId") REFERENCES "bounty_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bounty_payouts" ADD CONSTRAINT "bounty_payouts_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "bounties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_pool_transactions" ADD CONSTRAINT "community_pool_transactions_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "community_pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reputation_events" ADD CONSTRAINT "reputation_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
