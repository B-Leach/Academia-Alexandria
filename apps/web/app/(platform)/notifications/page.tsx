import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getNotifications, markNotificationsRead } from "@/actions/notifications";
import { Card, CardContent } from "@/components/ui/card";
import {
  Award,
  Bell,
  FileText,
  MessageSquare,
  Star,
  ThumbsUp,
  Users,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { NotificationItem } from "@/actions/notifications";

export const metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

const TYPE_ICONS: Record<NotificationItem["type"], typeof Award> = {
  paper_accepted: Award,
  endorsement_received: ThumbsUp,
  paper_endorsed_trusted: Star,
  bounty_review_completed: Star,
  new_review: FileText,
  new_comment: MessageSquare,
  co_author_invitation: Users,
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const notifications = await getNotifications();

  // Mark as read after fetching (so current unread items still show as unread)
  markNotificationsRead().catch(() => {});

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Updates on your papers, reviews, and invitations.
        </p>
      </div>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No notifications yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ll be notified when someone reviews your paper, leaves a
              comment, or sends you a co-author invitation.
            </p>
          </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((item) => {
            const Icon = TYPE_ICONS[item.type] ?? Bell;
            return (
              <Link
                key={item.id}
                href={item.paperId ? `/papers/${item.paperId}` : "#"}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent ${
                  item.isRead ? "opacity-60" : "border-primary/20 bg-primary/5"
                }`}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    item.isRead ? "text-muted-foreground" : "text-primary"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      item.isRead ? "text-muted-foreground" : "font-medium"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>
                {!item.isRead && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
