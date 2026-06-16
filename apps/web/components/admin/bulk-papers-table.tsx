"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { RetractPaperDialog } from "@/components/admin/retract-paper-dialog";
import { AssignDoiDialog } from "@/components/admin/assign-doi-dialog";
import { bulkRetractPapers } from "@/actions/admin";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-700",
  SUBMITTED: "bg-blue-500/10 text-blue-600",
  PUBLISHED: "bg-green-500/10 text-green-700",
  RETRACTED: "bg-red-500/10 text-red-700",
};

interface Paper {
  id: string;
  title: string;
  status: string;
  doi: string | null;
  similarityScore: number | null;
  plagiarismScore: number | null;
  plagiarismStatus: string | null;
  createdAt: Date;
  authors: { user: { name: string | null } }[];
}

export function BulkPapersTable({
  papers,
  crossrefEnabled,
}: {
  papers: Paper[];
  crossrefEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [retractOpen, setRetractOpen] = useState(false);
  const [retractReason, setRetractReason] = useState("");
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === papers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(papers.map((p) => p.id)));
    }
  };

  const handleBulkRetract = () => {
    startTransition(async () => {
      const result = await bulkRetractPapers([...selected], retractReason);
      if (result.error) {
        toast({ title: result.error, variant: "destructive" });
      } else {
        toast({ title: `Retracted ${result.count} papers`, variant: "success" });
        setSelected(new Set());
        router.refresh();
      }
      setRetractOpen(false);
      setRetractReason("");
    });
  };

  return (
    <>
      <BulkActionBar
        selectedCount={selected.size}
        actions={[
          { label: isPending ? "Processing..." : "Retract Selected", variant: "destructive", onClick: () => setRetractOpen(true) },
        ]}
        onClear={() => setSelected(new Set())}
      />

      <Dialog open={retractOpen} onOpenChange={setRetractOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retract {selected.size} papers?</DialogTitle>
            <DialogDescription>
              The selected papers will be marked as retracted. They will remain
              visible but clearly labeled. This action cannot be easily undone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for retraction..."
            value={retractReason}
            onChange={(e) => setRetractReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetractOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkRetract} disabled={isPending}>
              {isPending ? "Retracting..." : "Retract Papers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={papers.length > 0 && selected.size === papers.length}
                  onChange={toggleAll}
                  aria-label="Select all papers"
                  className="rounded border-input"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Authors</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">DOI</th>
              <th className="px-4 py-3 text-left font-medium">Integrity</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => (
              <tr
                key={paper.id}
                className={`border-b transition-colors hover:bg-muted/30 ${selected.has(paper.id) ? "bg-muted/20" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(paper.id)}
                    onChange={() => toggle(paper.id)}
                    aria-label={`Select ${paper.title}`}
                    className="rounded border-input"
                  />
                </td>
                <td className="max-w-xs px-4 py-3">
                  <Link
                    href={`/papers/${paper.id}`}
                    className="line-clamp-1 font-medium text-primary hover:underline"
                  >
                    {paper.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {paper.authors.map((a) => a.user.name).join(", ")}
                </td>
                <td className="px-4 py-3">
                  <Badge className={statusColors[paper.status] ?? ""}>
                    {paper.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {paper.doi ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      {paper.doi}
                    </span>
                  ) : paper.status === "PUBLISHED" ? (
                    <AssignDoiDialog
                      paperId={paper.id}
                      paperTitle={paper.title}
                      crossrefEnabled={crossrefEnabled}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <IntegrityBadges paper={paper} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatDate(paper.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/papers/${paper.id}`}>View</Link>
                    </Button>
                    {paper.status !== "DRAFT" && paper.status !== "RETRACTED" && (
                      <RetractPaperDialog paperId={paper.id} paperTitle={paper.title} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {papers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No papers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function IntegrityBadges({ paper }: { paper: Paper }) {
  const hasSimilarity = paper.similarityScore !== null && paper.similarityScore > 0;
  const hasPlagiarism = paper.plagiarismScore !== null;
  const isHighSimilarity = hasSimilarity && paper.similarityScore! >= 0.7;

  if (paper.status === "DRAFT") {
    return <span className="text-xs text-muted-foreground">&mdash;</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {hasSimilarity && (
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            isHighSimilarity
              ? "font-medium text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
        >
          {isHighSimilarity && <AlertTriangle className="h-3 w-3" />}
          {Math.round(paper.similarityScore! * 100)}% match
        </span>
      )}
      {paper.plagiarismStatus === "PENDING" && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Scan pending
        </span>
      )}
      {paper.plagiarismStatus === "COMPLETE" && hasPlagiarism && (
        <span
          className={`text-xs ${
            paper.plagiarismScore! > 30
              ? "font-medium text-red-600 dark:text-red-400"
              : "text-muted-foreground"
          }`}
        >
          {paper.plagiarismScore!}% external
        </span>
      )}
      {paper.plagiarismStatus === "FAILED" && (
        <span className="text-xs text-destructive">Scan failed</span>
      )}
      {!hasSimilarity && !paper.plagiarismStatus && (
        <span className="text-xs text-muted-foreground">&mdash;</span>
      )}
      {!hasSimilarity && paper.plagiarismStatus === "SKIPPED" && (
        <span className="text-xs text-muted-foreground">&mdash;</span>
      )}
    </div>
  );
}
