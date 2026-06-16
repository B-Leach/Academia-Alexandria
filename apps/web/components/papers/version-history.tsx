"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { History, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";

interface VersionEntry {
  version: number;
  title: string;
  createdAt: Date;
}

interface VersionHistoryProps {
  paperId: string;
  currentVersion: number;
  currentUpdatedAt: Date;
  versions: VersionEntry[];
  viewingVersion?: number;
}

export function VersionHistory({
  paperId,
  currentVersion,
  currentUpdatedAt,
  versions,
  viewingVersion,
}: VersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  // Nothing to show if only one version exists
  if (currentVersion <= 1 && versions.length === 0) return null;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50"
      >
        <History className="h-4 w-4 text-muted-foreground" />
        Version History
        <Badge variant="outline" className="ml-1 text-xs">
          {currentVersion} {currentVersion === 1 ? "version" : "versions"}
        </Badge>
        {expanded ? (
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <ul className="space-y-2">
            {/* Current version (from Paper record) */}
            <li className="flex items-center gap-3 text-sm">
              {viewingVersion && viewingVersion !== currentVersion ? (
                <Link
                  href={`/papers/${paperId}`}
                  className="font-medium text-primary hover:underline"
                >
                  v{currentVersion}
                </Link>
              ) : (
                <span className="font-medium">v{currentVersion}</span>
              )}
              <Badge variant="secondary" className="text-[10px]">current</Badge>
              <span className="text-muted-foreground">
                {formatDate(currentUpdatedAt)}
              </span>
            </li>
            {/* Previous versions (from PaperVersion records) */}
            {versions.map((v) => (
              <li key={v.version} className="flex items-center gap-3 text-sm">
                {viewingVersion === v.version ? (
                  <span className="font-medium">v{v.version}</span>
                ) : (
                  <Link
                    href={`/papers/${paperId}?v=${v.version}`}
                    className="font-medium text-primary hover:underline"
                  >
                    v{v.version}
                  </Link>
                )}
                <span className="text-muted-foreground">
                  {formatDate(v.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
