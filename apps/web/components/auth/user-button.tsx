import { auth, signOut } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import Link from "next/link";

export async function UserButton() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Get started</Link>
        </Button>
      </div>
    );
  }

  const initials = session.user.name ? getInitials(session.user.name) : "?";

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/profiles/${session.user.id}`}
        className="flex items-center gap-2 text-sm hover:underline"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={session.user.image ?? undefined}
            alt={session.user.name ?? "User avatar"}
          />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden md:inline">{session.user.name}</span>
      </Link>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button variant="ghost" size="sm" type="submit">
          Sign out
        </Button>
      </form>
    </div>
  );
}
