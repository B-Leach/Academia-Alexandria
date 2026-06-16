import Link from "next/link";
import { Bell, BookOpen } from "lucide-react";
import { UserButton } from "@/components/auth/user-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  unreadCount?: number;
  isAdmin?: boolean;
}

export function Header({ unreadCount = 0, isAdmin }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            <span>Academia Alexandria</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-4 text-sm md:flex">
            <Link
              href="/papers"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Papers
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <Link
            href="/notifications"
            className="relative hidden text-muted-foreground transition-colors hover:text-foreground md:block"
            aria-label={
              unreadCount > 0
                ? `Notifications (${unreadCount > 9 ? "9+" : unreadCount} unread)`
                : "Notifications"
            }
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <MobileNav isAdmin={isAdmin} unreadCount={unreadCount} />
          <UserButton />
        </div>
      </div>
    </header>
  );
}
