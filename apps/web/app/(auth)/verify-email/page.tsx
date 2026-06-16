import { db } from "@/lib/db";
import {
  verifyEmailVerificationToken,
  deleteEmailVerificationToken,
} from "@/lib/tokens";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Verify Email - Academia Alexandria",
  description: "Verify your email address",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h1 className="mb-2 text-2xl font-bold">Invalid Link</h1>
        <p className="text-muted-foreground">
          No verification token provided. Please check your email for the
          correct link.
        </p>
      </div>
    );
  }

  const email = await verifyEmailVerificationToken(token);

  if (!email) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h1 className="mb-2 text-2xl font-bold">Link Expired or Invalid</h1>
        <p className="text-muted-foreground mb-6">
          This verification link is invalid or has expired. Please sign in and
          request a new verification email from your dashboard.
        </p>
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  // Mark the user as verified
  await db.user.updateMany({
    where: { email, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  // Clean up the token
  await deleteEmailVerificationToken(token);

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
      <h1 className="mb-2 text-2xl font-bold">Email Verified</h1>
      <p className="text-muted-foreground mb-6">
        Your email address has been verified. You can now submit papers and
        write reviews.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
