"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading2, Link, List, ListOrdered, Quote, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
}

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end) || placeholder;
  const newText = text.substring(0, start) + before + selected + after + text.substring(end);
  const newCursorPos = start + before.length + selected.length;

  return { newText, newCursorPos };
}

const toolbarItems = [
  { icon: Bold, label: "Bold", before: "**", after: "**", placeholder: "bold text" },
  { icon: Italic, label: "Italic", before: "_", after: "_", placeholder: "italic text" },
  { icon: Heading2, label: "Heading", before: "## ", after: "", placeholder: "Heading" },
  { icon: Link, label: "Link", before: "[", after: "](url)", placeholder: "link text" },
  { icon: Quote, label: "Quote", before: "> ", after: "", placeholder: "quote" },
  { icon: List, label: "Bullet List", before: "- ", after: "", placeholder: "list item" },
  { icon: ListOrdered, label: "Numbered List", before: "1. ", after: "", placeholder: "list item" },
  { icon: Sigma, label: "Math", before: "$", after: "$", placeholder: "E=mc^2" },
] as const;

export function MarkdownEditor({
  name,
  value,
  onChange,
  placeholder = "Write your content using Markdown...",
  className,
  minRows = 20,
}: MarkdownEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  function handleToolbarClick(before: string, after: string, placeholderText: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { newText, newCursorPos } = insertMarkdown(textarea, before, after, placeholderText);
    onChange(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-input bg-muted/50 p-1">
        {toolbarItems.map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title={item.label}
            onClick={() => handleToolbarClick(item.before, item.after, item.placeholder)}
          >
            <item.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <Textarea
        ref={textareaRef}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[400px] rounded-t-none font-mono text-sm"
        rows={minRows}
      />
      <p className="text-xs text-muted-foreground">
        Supports Markdown formatting and LaTeX math (<code className="rounded bg-muted px-1">$...$</code> inline, <code className="rounded bg-muted px-1">$$...$$</code> block). Use the toolbar or write directly.
      </p>
    </div>
  );
}
