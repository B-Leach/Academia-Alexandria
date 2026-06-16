"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function BountySuccessBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("bounty");
    window.history.replaceState({}, "", url.toString());

    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="rounded-md border border-green-500/50 bg-green-500/10 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <p className="font-medium text-green-700 dark:text-green-400">
          Bounty created successfully!
        </p>
        <span className="text-sm text-green-600 dark:text-green-500">
          Your bounty is now active and visible to reviewers.
        </span>
      </div>
    </div>
  );
}
