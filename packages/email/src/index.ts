import { Resend } from "resend";
import type { ReactElement } from "react";

export { PasswordResetEmail } from "./templates/password-reset";
export { VerifyEmailEmail } from "./templates/verify-email";
export { WelcomeEmail } from "./templates/welcome";
export { ReviewReceivedEmail } from "./templates/review-received";
export { CommentReceivedEmail } from "./templates/comment-received";
export { EndorsementReceivedEmail } from "./templates/endorsement-received";
export { PaperAcceptedEmail } from "./templates/paper-accepted";
export { BountyPayoutEmail } from "./templates/bounty-payout";
export { CoAuthorInvitationEmail } from "./templates/co-author-invitation";
export { CoAuthorResponseEmail } from "./templates/co-author-response";
export { UnsubscribeFooter } from "./templates/unsubscribe-footer";

const globalForResend = globalThis as unknown as {
  resend: Resend | undefined;
};

function getResend(): Resend {
  if (globalForResend.resend) return globalForResend.resend;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const client = new Resend(process.env.RESEND_API_KEY);

  if (process.env.NODE_ENV !== "production") {
    globalForResend.resend = client;
  }

  return client;
}

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail({
  to,
  subject,
  react,
  headers,
}: {
  to: string;
  subject: string;
  react: ReactElement;
  headers?: Record<string, string>;
}) {
  const resend = getResend();
  const from =
    process.env.EMAIL_FROM ||
    "Academia Alexandria <noreply@academiaalexandria.org>";

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react,
    headers,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
