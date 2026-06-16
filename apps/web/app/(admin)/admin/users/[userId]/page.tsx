import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminUser } from "@/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BanUserDialog } from "@/components/admin/ban-user-dialog";
import { UnbanButton } from "@/components/admin/unban-button";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, FileText, MessageSquare, Star, ThumbsUp } from "lucide-react";

export const metadata = {
  title: "Admin - User Detail",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getAdminUser(userId);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back
          </Link>
        </Button>
      </div>

      {/* User Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="mt-1 text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex items-center gap-2">
            {user.role === "ADMIN" ? (
              <Badge className="bg-purple-500/10 text-purple-700">Admin</Badge>
            ) : user.role === "MODERATOR" ? (
              <Badge className="bg-blue-500/10 text-blue-700">Moderator</Badge>
            ) : (
              <Badge variant="secondary">User</Badge>
            )}
            {user.bannedAt ? (
              <Badge variant="destructive">Banned</Badge>
            ) : (
              <Badge className="bg-green-500/10 text-green-700">Active</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {user.bannedAt ? (
            <UnbanButton userId={user.id} userName={user.name} />
          ) : (
            user.role === "USER" && (
              <BanUserDialog userId={user.id} userName={user.name} />
            )
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/profiles/${user.id}`}>View Profile</Link>
          </Button>
        </div>
      </div>

      {/* Ban Info */}
      {user.bannedAt && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
          <p className="font-medium text-red-700">
            Banned on {formatDate(user.bannedAt)}
          </p>
          {user.bannedReason && (
            <p className="mt-1 text-sm text-red-600">Reason: {user.bannedReason}</p>
          )}
        </div>
      )}

      {/* Info */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Institution</span>
              <span>{user.institution ?? "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joined</span>
              <span>{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reputation</span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                {user.reputationScore}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Papers
              </span>
              <span>{user._count.authoredPapers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> Reviews
              </span>
              <span>{user._count.reviews}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" /> Endorsements
              </span>
              <span>{user._count.endorsementsGiven}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> Comments
              </span>
              <span>{user._count.comments}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
