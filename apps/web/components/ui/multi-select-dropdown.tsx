"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Group {
  label: string;
  items: { value: string; label: string }[];
}

interface MultiSelectDropdownProps {
  groups: Group[];
  selected: string[];
  onChange: (selected: string[]) => void;
  inputName: string;
  max: number;
  placeholder?: string;
}

export function MultiSelectDropdown({
  groups,
  selected,
  onChange,
  inputName,
  max,
  placeholder = "Select...",
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Build value -> label lookup
  const labelByValue = new Map<string, string>();
  for (const group of groups) {
    for (const item of group.items) {
      labelByValue.set(item.value, item.label);
    }
  }

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else if (selected.length < max) {
      onChange([...selected, value]);
    }
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs for form submission */}
      {selected.map((value) => (
        <input key={value} type="hidden" name={inputName} value={value} />
      ))}

      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              {labelByValue.get(value) ?? value}
              <button
                type="button"
                onClick={() => toggle(value)}
                className="ml-1 rounded-full p-0.5 hover:bg-muted"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/50 transition-colors"
        >
          <span className="text-muted-foreground">
            {selected.length === 0
              ? placeholder
              : `${selected.length}/${max} selected`}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isSelected = selected.includes(item.value);
                  const isDisabled = !isSelected && selected.length >= max;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => toggle(item.value)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
                        isSelected
                          ? "bg-primary/10 text-foreground"
                          : isDisabled
                            ? "text-muted-foreground/40 cursor-not-allowed"
                            : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      )}>
                        {isSelected && <span className="text-xs">&#10003;</span>}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
