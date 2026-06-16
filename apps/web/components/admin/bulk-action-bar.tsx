"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface BulkAction {
  label: string;
  variant?: "default" | "destructive" | "outline";
  onClick: () => void;
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClear,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? "outline"}
            size="sm"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onClear} className="ml-auto" aria-label="Clear selection">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
