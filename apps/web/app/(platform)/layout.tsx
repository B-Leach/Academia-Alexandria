import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import { EmailVerificationBanner } from "@/components/layout/email-verification-banner";
import { auth } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/actions/notifications";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.banned) {
    redirect("/auth/login");
  }

  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "MODERATOR";
  const showVerificationBanner = session?.user && !session.user.emailVerified;
  const unreadCount = session?.user?.id
    ? await getUnreadNotificationCount(session.user.id)
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Header isAdmin={isAdmin} unreadCount={unreadCount} />
      {showVerificationBanner && <EmailVerificationBanner />}
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar isAdmin={isAdmin} unreadCount={unreadCount} />
        <main id="main-content" className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
