import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPaper,
  getPaperVersion,
  getPaperVersionHistory,
  getReferences,
  getCitedBy,
} from "@/actions/paper";
import { getComments } from "@/actions/comment";
import { getReviews } from "@/actions/review";
import { getEndorsements } from "@/actions/endorsement";
import { getBounty } from "@/actions/bounty";
import { getBookmarkedPaperIds } from "@/actions/bookmark";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MarkdownRenderer } from "@/components/papers/markdown-renderer";
import { CommentSection } from "@/components/papers/comment-section";
import { ReviewSection } from "@/components/papers/review-section";
import { EndorsementSection } from "@/components/papers/endorsement-section";
import {
  SubmitButton,
  DeleteDraftButton,
} from "@/components/papers/publish-button";
import { CitePaperButton } from "@/components/papers/cite-paper-button";
import { DownloadPdfButton } from "@/components/papers/download-pdf-button";
import { BountySection } from "@/components/papers/bounty-section";
import { BountySuccessBanner } from "@/components/papers/bounty-success-banner";
import { ReportButton } from "@/components/report-button";
import { BookmarkButton } from "@/components/papers/bookmark-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { VersionHistory } from "@/components/papers/version-history";
import { ReferenceInput } from "@/components/papers/reference-input";
import { isStripeEnabled } from "@/lib/stripe";
import { displayName, formatDate, getBaseUrl } from "@/lib/utils";
import {
  getLicenseLabel,
  getLicenseUrl,
  CREDIT_ROLES,
  REVIEW_DEFAULTS,
} from "@academia-alexandria/shared";
import {
  Calendar,
  CheckCircle2,
  Download,
  Edit,
  ExternalLink,
  Eye,
  MessageSquare,
  Scale,
  Star,
  ThumbsUp,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ paperId: string }>;
}): Promise<Metadata> {
  const { paperId } = await params;
  const paper = await getPaper(paperId);
  if (!paper) return { title: "Paper" };

  const baseUrl = getBaseUrl();
  const authors = paper.authors
    .map((a) => a.user.name)
    .filter(Boolean) as string[];
  const isPublic =
    paper.status === "SUBMITTED" ||
    paper.status === "PUBLISHED" ||
    paper.status === "RETRACTED";

  const metadata: Metadata = {
    title: paper.title,
    description: paper.abstract.slice(0, 160),
    openGraph: {
      title: paper.title,
      description: paper.abstract.slice(0, 200),
      type: "article",
      url: `${baseUrl}/papers/${paperId}`,
      ...(paper.publishedAt && {
        publishedTime: paper.publishedAt.toISOString(),
      }),
    },
    twitter: {
      card: "summary",
      title: paper.title,
      description: paper.abstract.slice(0, 200),
    },
  };

  if (isPublic) {
    const other: Record<string, string | string[]> = {
      citation_title: paper.title,
    };
    if (authors.length > 0) other.citation_author = authors;
    if (paper.publishedAt) {
      other.citation_publication_date = paper.publishedAt
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "/");
    }
    if (paper.doi) other.citation_doi = paper.doi;
    if (paper.abstract) other.citation_abstract = paper.abstract;
    if (paper.keywords.length > 0)
      other.citation_keywords = paper.keywords.join("; ");
    if (paper.pdfUrl) {
      other.citation_pdf_url = `${baseUrl}/api/papers/${paperId}/pdf`;
    }
    metadata.other = other;
  }

  if (!isPublic) {
    metadata.robots = { index: false, follow: false };
  }

  return metadata;
}

export default async function PaperDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ paperId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { paperId } = await params;
  const query = await searchParams;
  const session = await auth();
  const sessionUserId = session?.user?.id;
  const sessionIsAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
  const [paper, comments, reviews, endorsements, bounty, bookmarkedIds, references, citedBy] =
    await Promise.all([
      getPaper(paperId),
      getComments(paperId),
      getReviews(paperId),
      getEndorsements(paperId),
      getBounty(paperId),
      getBookmarkedPaperIds(),
      getReferences(paperId),
      getCitedBy(paperId),
    ]);

  if (!paper) {
    notFound();
  }

  // Pending co-author invitations (for showing "Awaiting response" to authors)
  const pendingInvitations = sessionUserId
    ? await db.coAuthorInvitation.findMany({
        where: { paperId, status: "PENDING" },
        select: {
          invitee: { select: { name: true } },
        },
      })
    : [];

  // Version history
  const requestedVersion = query.v ? parseInt(query.v, 10) : undefined;
  const isViewingOldVersion = !!(
    requestedVersion && requestedVersion < paper.version
  );
  const [versionHistory, versionSnapshot] = await Promise.all([
    paper.version > 1 ? getPaperVersionHistory(paperId) : Promise.resolve([]),
    isViewingOldVersion
      ? getPaperVersion(paperId, requestedVersion)
      : Promise.resolve(null),
  ]);

  // If a specific old version was requested but not found, show latest
  const displayTitle = versionSnapshot?.title ?? paper.title;
  const displayAbstract = versionSnapshot?.abstract ?? paper.abstract;
  const displayContent = versionSnapshot?.content ?? paper.content;
  const displayPdfUrl = versionSnapshot?.pdfUrl ?? paper.pdfUrl;
  const displayKeywords = versionSnapshot?.keywords ?? paper.keywords;
  const displayDisciplines = versionSnapshot?.disciplines ?? paper.disciplines;
  const displayLicense = versionSnapshot?.license ?? paper.license;
  const displayFunding = versionSnapshot?.funding ?? paper.funding;
  const displayDataAvailability =
    versionSnapshot?.dataAvailability ?? paper.dataAvailability;
  const displayCompetingInterests =
    versionSnapshot?.competingInterests ?? paper.competingInterests;
  const displayEthicsStatement =
    versionSnapshot?.ethicsStatement ?? paper.ethicsStatement;
  const displayVersion =
    isViewingOldVersion && versionSnapshot ? requestedVersion : paper.version;

  // Use snapshot authors for old versions (if available), otherwise current authors
  const snapshotAuthors =
    isViewingOldVersion && versionSnapshot?.authors
      ? (versionSnapshot.authors as {
          userId: string;
          name: string;
          order: number;
          isCorresponding: boolean;
        }[])
      : null;

  const isAuthor = paper.authors.some((a) => a.userId === sessionUserId);
  const isAdmin = sessionIsAdmin;
  const isDraft = paper.status === "DRAFT";
  const isSubmitted = paper.status === "SUBMITTED";
  const isPublished = paper.status === "PUBLISHED";
  const isRetracted = paper.status === "RETRACTED";

  // Fetch user reputation for endorsement gating
  let userReputation = 0;
  const hasReviewed = reviews.some((r) => r.reviewer.id === session?.user?.id);
  const hasEndorsed = endorsements.some(
    (e) => e.endorser.id === session?.user?.id,
  );

  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { reputationScore: true },
    });
    userReputation = user?.reputationScore ?? 0;
  }

  // Don't show drafts to non-authors
  if (isDraft && !isAuthor) {
    notFound();
  }

  // Blind submission: hide author names from non-authors while paper is SUBMITTED
  const shouldHideAuthors =
    paper.isBlindSubmission && isSubmitted && !isAuthor && !isAdmin;

  // Increment view count for non-draft papers (fire-and-forget)
  if (!isDraft) {
    db.paper
      .update({
        where: { id: paperId },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  const isPublic = isSubmitted || isPublished || isRetracted;
  const baseUrl = getBaseUrl();
  const jsonLd = isPublic
    ? {
        "@context": "https://schema.org",
        "@type": "ScholarlyArticle",
        headline: paper.title,
        abstract: paper.abstract,
        author: paper.authors.map((a) => ({
          "@type": "Person" as const,
          name: a.user.name,
          ...(a.user.orcidId && {
            url: `https://orcid.org/${a.user.orcidId}`,
          }),
          ...(a.user.institution && {
            affiliation: {
              "@type": "Organization" as const,
              name: a.user.institution,
            },
          }),
        })),
        ...(paper.publishedAt && {
          datePublished: paper.publishedAt.toISOString(),
        }),
        dateCreated: paper.createdAt.toISOString(),
        ...(paper.keywords.length > 0 && {
          keywords: paper.keywords.join(", "),
        }),
        ...(paper.license && { license: getLicenseUrl(paper.license) }),
        ...(paper.doi && {
          identifier: {
            "@type": "PropertyValue" as const,
            propertyID: "DOI",
            value: paper.doi,
          },
        }),
        isAccessibleForFree: true,
        publisher: {
          "@type": "Organization" as const,
          name: "Academia Alexandria",
        },
        url: `${baseUrl}/papers/${paperId}`,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <Breadcrumb
        items={[
          { label: "Papers", href: "/papers" },
          { label: paper.title.length > 60 ? paper.title.slice(0, 60) + "..." : paper.title },
        ]}
      />

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Draft banner */}
      {isDraft && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                This paper is a draft
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Only you and co-authors can see this. Submit it to make it
                public and open for peer review.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <SubmitButton paperId={paper.id} />
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/papers/${paper.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeleteDraftButton paperId={paper.id} />
            </div>
          </div>
        </div>
      )}

      {/* Submitted banner */}
      {isSubmitted && isAuthor && (
        <div className="rounded-md border border-blue-500/50 bg-blue-500/10 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-400">
                This paper is awaiting peer review
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-500">
                Your paper is publicly visible. Once it receives{" "}
                {REVIEW_DEFAULTS.ACCEPTANCE_THRESHOLD} qualifying
                &ldquo;Sound&rdquo; reviews, a{" "}
                {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification
                period begins before acceptance.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/papers/${paper.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Revision suggested banner (dissent without cool-off) */}
      {isSubmitted && !paper.acceptanceEligibleAt && isAuthor && (() => {
        const qualifyingWithDissent = reviews.filter((r) => r.isQualifying);
        const hasDissent = qualifyingWithDissent.some((r) => r.recommendation !== "SOUND");
        if (!hasDissent) return null;
        return (
          <div className="rounded-md border border-orange-500/50 bg-orange-500/10 p-4">
            <p className="font-medium text-orange-700 dark:text-orange-400">
              Revision suggested
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-500">
              One or more qualifying reviewers have raised concerns about this
              paper. Consider revising based on their feedback. Updated papers
              will be re-evaluated for acceptance.
            </p>
          </div>
        );
      })()}

      {/* Cool-off period banner */}
      {isSubmitted && paper.acceptanceEligibleAt && (() => {
        const qualifyingReviewsList = reviews.filter((r) => r.isQualifying);
        const soundCount = qualifyingReviewsList.filter((r) => r.recommendation === "SOUND").length;
        const hasDissent = qualifyingReviewsList.some((r) => r.recommendation !== "SOUND");
        const cooloffEnd = new Date(
          paper.acceptanceEligibleAt.getTime() +
            REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_HOURS * 60 * 60 * 1000,
        );

        if (hasDissent) {
          return (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Verification period in progress
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                At least one qualifying review has raised concerns. The{" "}
                {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification
                period ends on {formatDate(cooloffEnd)}. Reviewers may edit or
                retract their reviews during this time.
              </p>
            </div>
          );
        }

        return (
          <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Acceptance criteria met &mdash; {soundCount} qualifying
              &ldquo;Sound&rdquo; reviews
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              This paper will be published on {formatDate(cooloffEnd)} after the{" "}
              {REVIEW_DEFAULTS.ACCEPTANCE_COOLOFF_DAYS}-day verification period,
              unless a review is changed or flagged by a moderator.
            </p>
          </div>
        );
      })()}

      {/* Published badge */}
      {isPublished && (
        <div className="rounded-md border border-green-500/50 bg-green-500/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="font-medium text-green-700 dark:text-green-400">
              Peer Reviewed
            </p>
            <span className="text-sm text-green-600 dark:text-green-500">
              This paper has been reviewed and accepted by the community.
            </span>
          </div>
        </div>
      )}

      {/* Retraction banner */}
      {isRetracted && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
          <p className="font-medium text-red-700 dark:text-red-400">
            This paper has been retracted
          </p>
          {paper.retractedReason && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {paper.retractedReason}
            </p>
          )}
        </div>
      )}

      {/* Bounty created success banner */}
      {query.bounty === "created" && <BountySuccessBanner />}

      {/* Old version banner */}
      {isViewingOldVersion && versionSnapshot && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                You are viewing version {requestedVersion} of this paper
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                The latest version is v{paper.version}.
              </p>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/papers/${paperId}`}>View latest version</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Paper Header */}
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">{displayTitle}</h1>
          <div className="flex shrink-0 gap-2">
            {!isDraft && (
              <CitePaperButton
                paper={paper}
                version={isViewingOldVersion ? displayVersion : undefined}
              />
            )}
            {(displayPdfUrl ||
              (displayContent && displayContent.length >= 100)) && (
              <DownloadPdfButton
                paperId={paper.id}
                title={displayTitle}
                version={isViewingOldVersion ? displayVersion : undefined}
              />
            )}
            {isAuthor && !isDraft && !isViewingOldVersion && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/papers/${paper.id}/edit`}>
                  <Edit className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}
            {session?.user?.id && !isDraft && (
              <BookmarkButton
                paperId={paper.id}
                isBookmarked={bookmarkedIds.has(paper.id)}
              />
            )}
            {session?.user?.id && !isAuthor && !isDraft && (
              <ReportButton targetType="PAPER" targetId={paper.id} />
            )}
          </div>
        </div>

        {/* Authors */}
        <div className="flex flex-wrap items-center gap-x-1 text-sm">
          {shouldHideAuthors ? (
            <span className="italic text-muted-foreground">
              Authors hidden for blind review
            </span>
          ) : snapshotAuthors ? (
            // Old version: use snapshot authors
            snapshotAuthors.map((author, i) => (
              <span key={author.userId}>
                <Link
                  href={`/profiles/${author.userId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {author.name}
                </Link>
                {author.isCorresponding && (
                  <span className="text-xs text-muted-foreground">*</span>
                )}
                {i < snapshotAuthors.length - 1 && <span>, </span>}
              </span>
            ))
          ) : (
            // Current version: use live author data
            paper.authors.map((author, i) => (
              <span key={author.userId}>
                <Link
                  href={`/profiles/${author.userId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {displayName(author.user.name, author.user.honorific)}
                </Link>
                {author.isCorresponding && (
                  <span className="text-xs text-muted-foreground">*</span>
                )}
                {author.user.institution && (
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    ({author.user.institution})
                  </span>
                )}
                {i < paper.authors.length - 1 && <span>, </span>}
              </span>
            ))
          )}
        </div>

        {/* Pending co-author invitations (visible to authors only) */}
        {isAuthor && pendingInvitations.length > 0 && (
          <p className="text-sm text-muted-foreground italic">
            Awaiting response from:{" "}
            {pendingInvitations.map((inv) => inv.invitee.name).join(", ")}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {displayDisciplines.map((d) => (
            <Badge key={d} variant="secondary">
              {d.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </Badge>
          ))}
          {displayLicense &&
            (() => {
              const licenseUrl = getLicenseUrl(displayLicense);
              const label = getLicenseLabel(displayLicense);
              return licenseUrl ? (
                <a
                  href={licenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <Scale className="h-3.5 w-3.5" />
                  {label}
                </a>
              ) : (
                <span className="flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5" />
                  {label}
                </span>
              );
            })()}
          {paper.publishedAt && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(paper.publishedAt)}
            </span>
          )}
          {displayVersion > 1 && (
            <Badge variant="outline">v{displayVersion}</Badge>
          )}
          {paper.doi && (
            <a
              href={`https://doi.org/${paper.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              DOI: {paper.doi}
            </a>
          )}
        </div>

        {/* Keywords */}
        {displayKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayKeywords.map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {paper.viewCount} views
          </span>
          <span className="flex items-center gap-1.5">
            <Download className="h-4 w-4" />
            {paper.downloadCount} downloads
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            {paper.commentCount} comments
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            {paper.reviewCount} reviews
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" />
            {paper.endorsementCount} endorsements
          </span>
        </div>
      </div>

      <Separator />

      {/* Abstract */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Abstract</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground">
            {displayAbstract}
          </p>
        </CardContent>
      </Card>

      {/* Funding */}
      {displayFunding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {displayFunding}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data Availability */}
      {displayDataAvailability && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {displayDataAvailability}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Competing Interests */}
      {displayCompetingInterests && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Competing Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {displayCompetingInterests}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Ethics / IRB Approval */}
      {displayEthicsStatement && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ethics / IRB Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {displayEthicsStatement}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Author Contributions (CRediT) */}
      {!shouldHideAuthors &&
        paper.authors.some((a) => a.contributions.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Author Contributions</CardTitle>
              <p className="text-xs text-muted-foreground">
                Following the Contributor Roles Taxonomy (CRediT)
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {paper.authors
                .filter((a) => a.contributions.length > 0)
                .map((author) => (
                  <div key={author.userId}>
                    <p className="text-sm font-medium">
                      {displayName(author.user.name, author.user.honorific)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {author.contributions
                        .map(
                          (c) =>
                            CREDIT_ROLES.find((r) => r.id === c)?.label ?? c,
                        )
                        .join(", ")}
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

      {/* Content */}
      {displayContent && (
        <>
          <Separator />
          <MarkdownRenderer content={displayContent} />
        </>
      )}

      {/* Version History */}
      {paper.version > 1 && (
        <>
          <Separator />
          <VersionHistory
            paperId={paper.id}
            currentVersion={paper.version}
            currentUpdatedAt={paper.updatedAt}
            versions={versionHistory}
            viewingVersion={isViewingOldVersion ? displayVersion : undefined}
          />
        </>
      )}

      {/* References */}
      {!isViewingOldVersion && (
        <>
          <Separator />
          <ReferenceInput
            paperId={paper.id}
            initialReferences={references}
            readOnly={!isAuthor || isPublished || isRetracted}
          />
        </>
      )}

      {/* Cited By */}
      {citedBy.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              Cited By ({citedBy.length})
            </h3>
            <ul className="space-y-2">
              {citedBy.map((ref) => (
                <li key={ref.id} className="text-sm">
                  <Link
                    href={`/papers/${ref.paper.id}`}
                    className="text-primary hover:underline"
                  >
                    {ref.paper.title}
                  </Link>
                  {ref.paper.publishedAt && (
                    <span className="ml-2 text-muted-foreground">
                      ({formatDate(ref.paper.publishedAt)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Comments + Reviews — visible on SUBMITTED, PUBLISHED, and RETRACTED papers (latest version only) */}
      {(isSubmitted || isPublished || isRetracted) && !isViewingOldVersion && (
        <>
          <Separator />
          <CommentSection
            paperId={paper.id}
            comments={comments}
            currentUserId={isRetracted ? undefined : session?.user?.id}
            currentPaperVersion={paper.version}
            isAdmin={isAdmin}
          />

          <Separator />
          <ReviewSection
            paperId={paper.id}
            reviews={reviews}
            currentUserId={session?.user?.id}
            isAuthor={isAuthor}
            hasReviewed={hasReviewed}
            paperStatus={paper.status}
            isAdmin={isAdmin}
            bountyAmountCents={
              bounty?.status === "ACTIVE" ? bounty.totalAmountCents : undefined
            }
          />

          {/* Bounty section */}
          {isStripeEnabled() && (
            <>
              <Separator />
              <BountySection
                paperId={paper.id}
                isAuthor={isAuthor}
                paperStatus={paper.status}
              />
            </>
          )}
        </>
      )}

      {/* Endorsements — only on PUBLISHED (peer reviewed) papers, not retracted, latest version only */}
      {isPublished && !isRetracted && !isViewingOldVersion && (
        <>
          <Separator />
          <EndorsementSection
            paperId={paper.id}
            endorsements={endorsements}
            currentUserId={session?.user?.id}
            isAuthor={isAuthor}
            hasEndorsed={hasEndorsed}
            userReputation={userReputation}
          />
        </>
      )}
    </div>
  );
}
