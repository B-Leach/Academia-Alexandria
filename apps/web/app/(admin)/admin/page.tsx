import { getAdminStats, getRevenueStats } from "@/actions/admin";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, MessageSquare, ThumbsUp, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = {
  title: "Admin Dashboard",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-700",
  SUBMITTED: "bg-blue-500/10 text-blue-600",
  PUBLISHED: "bg-green-500/10 text-green-700",
  RETRACTED: "bg-red-500/10 text-red-700",
};

export default async function AdminDashboardPage() {
  const session = await auth();
  const isOwner = session?.user?.role === "ADMIN";
  const [stats, revenue] = await Promise.all([
    getAdminStats(),
    isOwner ? getRevenueStats() : null,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Platform overview and statistics.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Papers</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalPapers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(stats.statusCounts.PUBLISHED ?? 0)} published, {formatNumber(stats.statusCounts.SUBMITTED ?? 0)} submitted, {formatNumber(stats.statusCounts.DRAFT ?? 0)} drafts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalReviews)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Endorsements</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalEndorsements)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Stats (Admin-only) */}
      {revenue && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Revenue</h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <Card className="border-green-500/30">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  ${(revenue.totalPlatformRevenueCents / 100).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  10% fee from {revenue.totalBounties} bounties
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Paid to Reviewers</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(revenue.totalPaidOutCents / 100).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {revenue.completedBounties} completed, {revenue.activeBounties} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(revenue.pendingPayoutCents / 100).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unclaimed by reviewers
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/admin/users"
              className="mt-4 block text-center text-sm text-primary hover:underline"
            >
              View all users
            </Link>
          </CardContent>
        </Card>

        {/* Recent Papers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Papers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentPapers.map((paper) => (
                <Link
                  key={paper.id}
                  href={`/papers/${paper.id}`}
                  className="flex items-center justify-between rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{paper.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {paper.authors[0]?.user.name ?? "Unknown"}
                    </p>
                  </div>
                  <Badge className={statusColors[paper.status] ?? ""}>
                    {paper.status}
                  </Badge>
                </Link>
              ))}
            </div>
            <Link
              href="/admin/papers"
              className="mt-4 block text-center text-sm text-primary hover:underline"
            >
              View all papers
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
