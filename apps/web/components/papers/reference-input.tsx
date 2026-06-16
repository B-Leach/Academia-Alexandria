"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, ExternalLink, Trash2 } from "lucide-react";
import { saveReferences } from "@/actions/paper";
import { toast } from "@/hooks/use-toast";

interface ReferenceInputProps {
  paperId: string;
  initialReferences: {
    id: string;
    title: string;
    authors: string;
    year: number | null;
    doi: string | null;
    url: string | null;
    journal: string | null;
    citedPaperId: string | null;
    sortOrder: number;
  }[];
  readOnly?: boolean;
}

export function ReferenceInput({
  paperId,
  initialReferences,
  readOnly,
}: ReferenceInputProps) {
  const [bibtex, setBibtex] = useState("");
  const [references, setReferences] = useState(initialReferences);
  const [isPending, startTransition] = useTransition();
  const [showInput, setShowInput] = useState(false);

  function handleSave() {
    if (!bibtex.trim()) return;
    startTransition(async () => {
      const result = await saveReferences(paperId, bibtex);
      if (result.success) {
        toast({ title: `Saved ${result.count} references` });
        setBibtex("");
        setShowInput(false);
        // Refresh the page to get updated references
        window.location.reload();
      } else {
        toast({ title: result.error ?? "Failed to save references", variant: "destructive" });
      }
    });
  }

  if (readOnly && references.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="h-5 w-5" />
          References ({references.length})
        </h3>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInput(!showInput)}
          >
            {showInput ? "Cancel" : references.length > 0 ? "Update References" : "Add References"}
          </Button>
        )}
      </div>

      {showInput && !readOnly && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Paste your BibTeX entries below. Existing references will be
            replaced. References with DOIs matching papers on this platform will
            be automatically linked.
          </p>
          <textarea
            value={bibtex}
            onChange={(e) => setBibtex(e.target.value)}
            placeholder={`@article{smith2024,
  title = {Example Paper Title},
  author = {Smith, John and Doe, Jane},
  journal = {Journal of Examples},
  year = {2024},
  doi = {10.1234/example}
}`}
            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isPending || !bibtex.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Parse & Save
            </Button>
            {references.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  startTransition(async () => {
                    // Save empty to clear all references
                    const result = await saveReferences(paperId, "@misc{empty, title = {}}");
                    if (result.error) {
                      toast({ title: result.error, variant: "destructive" });
                    } else {
                      setReferences([]);
                      toast({ title: "References cleared" });
                    }
                  });
                }}
                disabled={isPending}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {references.length > 0 && (
        <ol className="space-y-2 list-decimal pl-6">
          {references.map((ref) => (
            <li key={ref.id} className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">
                {ref.citedPaperId ? (
                  <a
                    href={`/papers/${ref.citedPaperId}`}
                    className="text-primary hover:underline"
                  >
                    {ref.title}
                  </a>
                ) : (
                  ref.title
                )}
              </span>
              {ref.authors && (
                <span>. {ref.authors}</span>
              )}
              {ref.journal && <span>. <em>{ref.journal}</em></span>}
              {ref.year && <span> ({ref.year})</span>}
              {ref.doi && (
                <a
                  href={`https://doi.org/${ref.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                >
                  DOI <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
