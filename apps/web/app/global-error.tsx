/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect } from "react";
import { BookOpen, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("An error occurred. Digest:", error.digest ?? "unknown");
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
            <a href="/" className="flex items-center gap-2 font-semibold">
              <BookOpen className="h-5 w-5" />
              <span>Academia Alexandria</span>
            </a>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
