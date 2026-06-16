"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface RorResult {
  id: string;
  name: string;
  country: string;
}

interface RorApiName {
  value?: string;
  types?: string[];
}

interface RorApiItem {
  id?: string;
  names?: RorApiName[];
  locations?: { geonames_details?: { country_name?: string } }[];
}

interface InstitutionPickerProps {
  defaultInstitution?: string | null;
  defaultRorId?: string | null;
}

export function InstitutionPicker({
  defaultInstitution,
  defaultRorId,
}: InstitutionPickerProps) {
  const [query, setQuery] = useState(defaultInstitution ?? "");
  const [rorId, setRorId] = useState(defaultRorId ?? "");
  const [results, setResults] = useState<RorResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleInputChange(value: string) {
    setQuery(value);
    // Clear ROR ID when user types (they're modifying the selection)
    setRorId("");

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.ror.org/v2/organizations?query=${encodeURIComponent(value.trim())}`,
        );
        if (!res.ok) throw new Error("ROR API error");
        const data = await res.json();
        const items: RorResult[] = (data.items ?? [])
          .slice(0, 8)
          .map((item: RorApiItem) => ({
            id: item.id?.replace("https://ror.org/", "") ?? "",
            name:
              item.names?.find((n: RorApiName) => n.types?.includes("ror_display"))
                ?.value ??
              item.names?.[0]?.value ??
              "",
            country: item.locations?.[0]?.geonames_details?.country_name ?? "",
          }));
        setResults(items);
        setOpen(items.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function selectInstitution(result: RorResult) {
    setQuery(result.name);
    setRorId(result.id);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id="institution"
          name="institution"
          role="combobox"
          aria-expanded={open}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search for your institution..."
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <input type="hidden" name="rorId" value={rorId} />

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul role="listbox" className="max-h-60 overflow-auto py-1">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => selectInstitution(result)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{result.name}</span>
                  {result.country && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {result.country}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rorId && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400">
          Linked to ROR: {rorId}
        </p>
      )}
      {query.length >= 3 && !rorId && !loading && !open && (
        <p className="mt-1 text-xs text-muted-foreground">
          Institution not found in ROR? Your text will be saved as-is.
        </p>
      )}
    </div>
  );
}
