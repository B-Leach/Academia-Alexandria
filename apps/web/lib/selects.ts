/** Prisma select object for paper list cards. Shared across actions. */
export const paperListSelect = {
  id: true,
  title: true,
  abstract: true,
  status: true,
  isBlindSubmission: true,
  disciplines: true,
  keywords: true,
  publishedAt: true,
  commentCount: true,
  reviewCount: true,
  endorsementCount: true,
  authors: {
    select: {
      user: { select: { id: true, name: true, honorific: true } },
      order: true,
    },
    orderBy: { order: "asc" as const },
  },
  bounty: {
    select: {
      totalAmountCents: true,
      status: true,
    },
  },
} as const;
