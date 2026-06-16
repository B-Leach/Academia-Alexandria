"use client";

import { useState, useRef, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  createPaper,
  updatePaper,
  type PaperActionResult,
} from "@/actions/paper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MarkdownEditor } from "@/components/papers/markdown-editor";
import { CoAuthorPicker } from "@/components/papers/co-author-picker";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import {
  DISCIPLINES,
  PAPER_LICENSES,
  CREDIT_ROLES,
} from "@academia-alexandria/shared";
import { UPLOAD_LIMITS } from "@/lib/validators/upload";
import {
  Loader2,
  FileUp,
  FileText,
  PenLine,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ContentMode = "markdown" | "pdf";

interface PaperFormProps {
  paperId?: string;
  defaultValues?: {
    title: string;
    abstract: string;
    content: string;
    disciplines: string[];
    keywords: string[];
    license?: string | null;
    funding?: string | null;
    dataAvailability?: string | null;
    competingInterests?: string | null;
    ethicsStatement?: string | null;
    contributions?: string[];
    coAuthorIds: string[];
    hasPdf?: boolean;
  };
}

const DISCIPLINE_GROUPS = DISCIPLINES.map((d) => ({
  label: d.name,
  items: (d.children ?? []).map((child) => ({
    value: child.slug,
    label: child.name,
  })),
}));

function getInitialContentMode(
  defaultValues?: PaperFormProps["defaultValues"],
): ContentMode {
  if (defaultValues?.hasPdf) return "pdf";
  return "markdown";
}

export function PaperForm({ paperId, defaultValues }: PaperFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(defaultValues?.content ?? "");
  const [keywords, setKeywords] = useState<string[]>(
    defaultValues?.keywords ?? [],
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>(
    defaultValues?.disciplines ?? [],
  );
  const [abstractLength, setAbstractLength] = useState(
    defaultValues?.abstract?.length ?? 0,
  );

  // Content mode: markdown or pdf (mutually exclusive)
  const [contentMode, setContentMode] = useState<ContentMode>(
    getInitialContentMode(defaultValues),
  );

  // PDF upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [hasExistingPdf, setHasExistingPdf] = useState(
    defaultValues?.hasPdf ?? false,
  );
  const [isUploading, setIsUploading] = useState(false);

  const [contributions, setContributions] = useState<string[]>(
    defaultValues?.contributions ?? [],
  );

  const isEditing = !!paperId;

  function toggleContribution(roleId: string) {
    setContributions((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  }

  function handlePdfSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPdfError(null);
    if (!file) {
      setPdfFile(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setPdfError("Only PDF files are allowed");
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > UPLOAD_LIMITS.PAPER_PDF_MAX) {
      setPdfError(`File too large. Maximum size: ${Math.round(UPLOAD_LIMITS.PAPER_PDF_MAX / (1024 * 1024))} MB`);
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setPdfFile(file);
  }

  function removePdf() {
    setPdfFile(null);
    setPdfError(null);
    setHasExistingPdf(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleModeChange(mode: string) {
    setContentMode(mode as ContentMode);
    if (mode === "markdown") {
      // Clear PDF selection when switching to markdown
      setPdfFile(null);
      setPdfError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const [state, formAction, isPending] = useActionState<
    PaperActionResult,
    FormData
  >(async (_prev, formData) => {
    // Set content based on mode
    formData.set("content", contentMode === "markdown" ? content : "");
    formData.set("contentMode", contentMode);
    formData.set("keywords", keywords.join(","));
    formData.set("contributions", contributions.join(","));

    const result = isEditing
      ? await updatePaper(paperId, formData)
      : await createPaper(formData);

    if (!result.success || !result.paperId) {
      return result;
    }

    // Upload PDF if in PDF mode and a file was selected
    if (contentMode === "pdf" && pdfFile) {
      setIsUploading(true);
      try {
        const uploadData = new FormData();
        uploadData.set("file", pdfFile);
        uploadData.set("paperId", result.paperId);

        const res = await fetch("/api/upload/paper-pdf", {
          method: "POST",
          body: uploadData,
        });

        if (!res.ok) {
          const body = await res.json();
          setIsUploading(false);
          return { error: body.error || "PDF upload failed" };
        }
      } catch {
        setIsUploading(false);
        return {
          error: "PDF upload failed. Your paper was saved without the PDF.",
        };
      }
      setIsUploading(false);
    }

    router.push(`/papers/${result.paperId}`);
    return result;
  }, {});

  function addKeyword() {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw) && keywords.length < 10) {
      setKeywords([...keywords, kw]);
      setKeywordInput("");
    }
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  return (
    <form action={formAction} className="space-y-10">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="space-y-3">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          placeholder="Enter your paper title"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="abstract">Abstract</Label>
        <Textarea
          id="abstract"
          name="abstract"
          defaultValue={defaultValues?.abstract ?? ""}
          placeholder="Provide a concise summary of your paper (50-5000 characters)"
          rows={6}
          onChange={(e) => setAbstractLength(e.target.value.length)}
          maxLength={5000}
        />
        <p
          className={cn(
            "text-right text-xs",
            abstractLength === 0
              ? "text-muted-foreground"
              : abstractLength < 50
                ? "text-destructive"
                : "text-green-600 dark:text-green-400",
          )}
        >
          {abstractLength.toLocaleString()} / 5,000
          {abstractLength > 0 &&
            abstractLength < 50 &&
            " (minimum 50 to publish)"}
        </p>
      </div>

      <div className="space-y-3">
        <Label>Disciplines</Label>
        <MultiSelectDropdown
          groups={DISCIPLINE_GROUPS}
          selected={disciplines}
          onChange={setDisciplines}
          inputName="disciplines"
          max={3}
          placeholder="Select disciplines..."
        />
      </div>

      <div className="space-y-3">
        <Label>Keywords</Label>
        <div className="flex gap-3">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="Type a keyword and press Enter"
          />
          <Button type="button" variant="outline" onClick={addKeyword}>
            Add
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  aria-label={`Remove keyword ${kw}`}
                  className="hover:text-destructive"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {keywords.length}/10 keywords
        </p>
      </div>

      <div className="space-y-3">
        <Label>License</Label>
        <Select name="license" defaultValue={defaultValues?.license || "none"}>
          <SelectTrigger>
            <SelectValue placeholder="No license selected" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No license selected</SelectItem>
            {PAPER_LICENSES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose a license to let readers know how they may use your work.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="funding">Funding (optional)</Label>
        <Textarea
          id="funding"
          name="funding"
          defaultValue={defaultValues?.funding ?? ""}
          placeholder="List funding sources, grant numbers, or sponsoring organizations (optional)"
          rows={3}
          maxLength={5000}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="dataAvailability">
          Data Availability Statement (optional)
        </Label>
        <Textarea
          id="dataAvailability"
          name="dataAvailability"
          defaultValue={defaultValues?.dataAvailability ?? ""}
          placeholder="Describe where the data supporting your findings can be accessed, or state if no datasets were generated..."
          rows={3}
          maxLength={5000}
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="competingInterests">
          Competing Interests Statement (optional)
        </Label>
        <Textarea
          id="competingInterests"
          name="competingInterests"
          defaultValue={defaultValues?.competingInterests ?? ""}
          placeholder='Declare any competing interests, or state "The authors declare no competing interests."'
          rows={3}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground">
          Financial, professional, or personal relationships that could
          influence this work.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="ethicsStatement">
          Ethics / IRB Approval Statement (optional)
        </Label>
        <Textarea
          id="ethicsStatement"
          name="ethicsStatement"
          defaultValue={defaultValues?.ethicsStatement ?? ""}
          placeholder="If applicable, provide your ethics committee or IRB approval details (e.g., protocol number, approval date, committee name)."
          rows={3}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground">
          Required for research involving human participants, animal subjects,
          or sensitive data.
        </p>
      </div>

      <div className="space-y-3">
        <Label>My Contributions (CRediT)</Label>
        <p className="text-sm text-muted-foreground">
          Select the roles that describe your contributions to this paper.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CREDIT_ROLES.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={contributions.includes(role.id)}
                onChange={() => toggleContribution(role.id)}
                className="rounded border-input"
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>

      {!isEditing && (
        <div className="space-y-3">
          <Label>Co-Authors (optional)</Label>
          <CoAuthorPicker />
          <p className="text-xs text-muted-foreground">
            Co-authors will receive an invitation they can accept or decline.
          </p>
        </div>
      )}

      {/* Content: Markdown OR PDF (mutually exclusive) */}
      <div className="space-y-3">
        <Label>Paper Content</Label>
        <Tabs value={contentMode} onValueChange={handleModeChange}>
          <TabsList>
            <TabsTrigger value="markdown" className="gap-1.5">
              <PenLine className="h-3.5 w-3.5" />
              Write in Markdown
            </TabsTrigger>
            <TabsTrigger value="pdf" className="gap-1.5">
              <FileUp className="h-3.5 w-3.5" />
              Upload PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="markdown">
            <MarkdownEditor
              name="content"
              value={content}
              onChange={setContent}
            />
          </TabsContent>

          <TabsContent value="pdf">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Upload a PDF version of your paper. Maximum size: {Math.round(UPLOAD_LIMITS.PAPER_PDF_MAX / (1024 * 1024))} MB.
              </p>

              {hasExistingPdf && !pdfFile && (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <a
                    href={`/api/papers/${paperId}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-4 hover:underline truncate"
                  >
                    Current PDF
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePdf}
                    className="ml-auto shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              )}

              {pdfFile && (
                <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                  <FileText className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  <span className="text-sm truncate">{pdfFile.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({(pdfFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removePdf}
                    className="ml-auto shrink-0"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {!pdfFile && !hasExistingPdf && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <FileUp className="h-5 w-5" />
                  Click to select a PDF file
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfSelect}
                    className="hidden"
                  />
                </label>
              )}

              {pdfError && (
                <p className="text-sm text-destructive">{pdfError}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending || isUploading}>
          {(isPending || isUploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isUploading
            ? "Uploading PDF..."
            : isEditing
              ? "Save Changes"
              : "Save as Draft"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
