"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, X as XIcon } from "lucide-react";
import { cn, displayName, getInitials } from "@/lib/utils";

interface UserResult {
  id: string;
  name: string | null;
  honorific: string | null;
  emailHint: string;
  image: string | null;
  institution: string | null;
}

function getUserInitials(name: string | null, emailHint: string): string {
  if (name) return getInitials(name);
  return emailHint[0].toUpperCase();
}

export function CoAuthorPicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [selected, setSelected] = useState<UserResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(value.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          const selectedIds = new Set(selected.map((u) => u.id));
          setResults(
            (data.users as UserResult[]).filter((u) => !selectedIds.has(u.id)),
          );
          setOpen(true);
        }
      } catch {
        // Silently ignore network errors
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function addUser(user: UserResult) {
    if (selected.length >= 10) return;
    setSelected((prev) => [...prev, user]);
    setResults((prev) => prev.filter((u) => u.id !== user.id));
    setQuery("");
    setOpen(false);
  }

  function removeUser(userId: string) {
    setSelected((prev) => prev.filter((u) => u.id !== userId));
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs for form submission */}
      {selected.map((user) => (
        <input key={user.id} type="hidden" name="coAuthorIds" value={user.id} />
      ))}

      {/* Selected co-authors */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-sm text-secondary-foreground"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {getUserInitials(user.name, user.emailHint)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {user.name
                  ? displayName(user.name, user.honorific)
                  : user.emailHint}
              </span>
              {user.name && (
                <span className="text-muted-foreground">
                  ({user.emailHint})
                </span>
              )}
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                aria-label={`Remove ${user.name ?? user.emailHint}`}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted hover:text-destructive"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            role="combobox"
            aria-expanded={open}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search by name or email..."
            className="pl-9"
            disabled={selected.length >= 10}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {open && (
          <div role="listbox" className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {results.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addUser(user)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user.name, user.emailHint)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {user.name
                        ? displayName(user.name, user.honorific)
                        : user.emailHint}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user.emailHint}
                      {user.institution && ` · ${user.institution}`}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {selected.length >= 10 && (
        <p className="text-xs text-muted-foreground">
          Maximum of 10 co-authors reached.
        </p>
      )}
    </div>
  );
}
