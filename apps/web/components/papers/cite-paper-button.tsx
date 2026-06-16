"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  formatCitation,
  type CitationData,
  type CitationFormat,
} from "@/lib/citations";
import { Check, Copy, Download, Quote } from "lucide-react";

interface CitePaperButtonProps {
  paper: {
    id: string;
    title: string;
    abstract: string;
    keywords: string[];
    doi?: string | null;
    publishedAt?: Date | string | null;
    version: number;
    authors: {
      user: { name: string; institution?: string | null };
      order: number;
    }[];
  };
  version?: number;
}

const FORMATS: { value: CitationFormat; label: string }[] = [
  { value: "bibtex", label: "BibTeX" },
  { value: "apa", label: "APA" },
  { value: "mla", label: "MLA" },
  { value: "chicago", label: "Chicago" },
  { value: "ris", label: "RIS" },
  { value: "csl-json", label: "CSL-JSON" },
];

const DOWNLOADABLE_FORMATS: Record<string, { ext: string; mime: string }> = {
  bibtex: { ext: ".bib", mime: "application/x-bibtex" },
  ris: { ext: ".ris", mime: "application/x-research-info-systems" },
  "csl-json": { ext: ".json", mime: "application/json" },
};

export function CitePaperButton({ paper, version }: CitePaperButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CitationFormat>("bibtex");
  const [copied, setCopied] = useState(false);

  const citationData: CitationData = useMemo(
    () => ({
      id: paper.id,
      title: paper.title,
      abstract: paper.abstract,
      keywords: paper.keywords,
      doi: paper.doi,
      publishedAt: paper.publishedAt,
      version: paper.version,
      pinnedVersion: version,
      authors: paper.authors
        .sort((a, b) => a.order - b.order)
        .map((a) => ({
          name: a.user.name,
          institution: a.user.institution,
        })),
    }),
    [paper, version],
  );

  function getCitation(format: CitationFormat): string {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/papers/${paper.id}`
        : undefined;
    return formatCitation({ ...citationData, url }, format);
  }

  async function handleCopy() {
    const text = getCitation(activeTab);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard", variant: "success" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }

  function handleDownload() {
    const dl = DOWNLOADABLE_FORMATS[activeTab];
    if (!dl) return;

    const text = getCitation(activeTab);
    const slug = paper.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);

    const blob = new Blob([text], { type: dl.mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}${dl.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Quote className="mr-1 h-3.5 w-3.5" />
          Cite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Cite This Paper</DialogTitle>
          <DialogDescription>
            Copy a formatted citation or download for your reference manager.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as CitationFormat)}
          className="min-w-0"
        >
          <TabsList className="w-full justify-start">
            {FORMATS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {FORMATS.map((f) => (
            <TabsContent key={f.value} value={f.value} className="mt-4">
              <div className="relative">
                <pre className="max-h-64 overflow-auto break-all whitespace-pre-wrap rounded-md bg-muted p-4 pr-12 font-mono text-sm">
                  {getCitation(f.value)}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={handleCopy}
                  aria-label="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        {DOWNLOADABLE_FORMATS[activeTab] && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Download {DOWNLOADABLE_FORMATS[activeTab].ext}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
