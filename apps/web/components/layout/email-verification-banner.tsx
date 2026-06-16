"use client";

import { useState } from "react";
import { resendVerificationEmail } from "@/actions/auth";

export function EmailVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState(false);

  async function handleResend() {
    setSending(true);
    setError(false);
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        setSent(true);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <p>
          Please verify your email address to submit papers and write reviews.
        </p>
        {sent ? (
          <span className="shrink-0 font-medium text-green-700">
            Verification email sent!
          </span>
        ) : error ? (
          <button
            onClick={handleResend}
            className="shrink-0 font-medium text-red-700 underline hover:no-underline"
          >
            Failed to send — try again
          </button>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="shrink-0 font-medium underline hover:no-underline disabled:opacity-50"
          >
            {sending ? "Sending..." : "Resend verification email"}
          </button>
        )}
      </div>
    </div>
  );
}
