"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  LayoutDashboard,
  FileText,
  Search,
  PenSquare,
  Settings,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/papers/mine", label: "My Papers", icon: FileText },
  { href: "/papers", label: "Browse Papers", icon: Search },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/reputation", label: "Reputation", icon: Star },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/papers/new", label: "New Paper", icon: PenSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/papers/mine") {
    return pathname.startsWith("/papers/mine");
  }
  if (href === "/papers/new") {
    return pathname === "/papers/new";
  }
  if (href === "/papers") {
    return (
      pathname === "/papers" ||
      (pathname.startsWith("/papers/") &&
        !pathname.startsWith("/papers/mine") &&
        !pathname.startsWith("/papers/new"))
    );
  }
  return pathname === href;
}

export function Sidebar({
  isAdmin,
  unreadCount = 0,
}: {
  isAdmin?: boolean;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
      <div className="flex h-full flex-col gap-2 p-4">
        <nav aria-label="Sidebar" className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, item.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.href === "/notifications" && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
          {isAdmin && (
            <>
              <Separator className="my-2" />
              <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Admin
              </div>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/admin"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Shield className="h-4 w-4" />
                Admin Overview
              </Link>
              <Link
                href="/admin/users"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/users")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Users className="h-4 w-4" />
                Manage Users
              </Link>
              <Link
                href="/admin/papers"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin/papers")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <FileText className="h-4 w-4" />
                Manage Papers
              </Link>
            </>
          )}
        </nav>
        <Link
          href="/reputation"
          className="mt-auto block rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:bg-accent/50"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4 text-yellow-500" />
            Reputation
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Earn reputation by publishing papers, writing reviews, and
            contributing to the community.
          </p>
        </Link>
      </div>
    </aside>
  );
}
