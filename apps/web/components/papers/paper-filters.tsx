"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DISCIPLINES } from "@academia-alexandria/shared";
import { SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

interface PaperFiltersProps {
  params: Record<string, string | undefined>;
}

export function PaperFilters({ params }: PaperFiltersProps) {
  const hasFilters = !!((params.discipline && params.discipline !== "all") || (params.status && params.status !== "all") || params.dateFrom || params.dateTo);
  const [showFilters, setShowFilters] = useState(hasFilters);

  return (
    <div className="space-y-4">
      {/* Search bar — always visible */}
      <form className="flex gap-2" method="GET">
        {/* Carry hidden filter values so they persist on search */}
        {showFilters && params.discipline && params.discipline !== "all" && (
          <input type="hidden" name="discipline" value={params.discipline} />
        )}
        {showFilters && params.status && params.status !== "all" && (
          <input type="hidden" name="status" value={params.status} />
        )}
        {showFilters && params.dateFrom && (
          <input type="hidden" name="dateFrom" value={params.dateFrom} />
        )}
        {showFilters && params.dateTo && (
          <input type="hidden" name="dateTo" value={params.dateTo} />
        )}
        {showFilters && params.sort && (
          <input type="hidden" name="sort" value={params.sort} />
        )}
        <Input
          name="query"
          placeholder="Search by title, abstract, keywords, or author..."
          defaultValue={params.query ?? ""}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "border-primary text-primary" : ""}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </form>

      {/* Collapsible filter section */}
      {showFilters && (
        <form
          className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-end"
          method="GET"
        >
          {/* Carry the search query so it persists when filters are applied */}
          {params.query && (
            <input type="hidden" name="query" value={params.query} />
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Discipline
            </Label>
            <Select name="discipline" defaultValue={params.discipline || "all"}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Disciplines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disciplines</SelectItem>
                {DISCIPLINES.map((d) => (
                  <SelectGroup key={d.slug}>
                    <SelectLabel>{d.name}</SelectLabel>
                    {d.children?.map((child) => (
                      <SelectItem key={child.slug} value={child.slug}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Status
            </Label>
            <Select name="status" defaultValue={params.status || "all"}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Active Papers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Papers</SelectItem>
                <SelectItem value="SUBMITTED">Open for Review</SelectItem>
                <SelectItem value="PUBLISHED">Peer Reviewed</SelectItem>
                <SelectItem value="RETRACTED">Retracted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              From
            </Label>
            <Input
              name="dateFrom"
              type="date"
              defaultValue={params.dateFrom ?? ""}
              className="w-auto"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              To
            </Label>
            <Input
              name="dateTo"
              type="date"
              defaultValue={params.dateTo ?? ""}
              className="w-auto"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Sort by
            </Label>
            <Select
              name="sort"
              defaultValue={params.sort ?? (params.query ? "relevance" : "newest")}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {params.query && (
                  <SelectItem value="relevance">Relevance</SelectItem>
                )}
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="most-viewed">Most Viewed</SelectItem>
                <SelectItem value="most-endorsed">Most Endorsed</SelectItem>
                <SelectItem value="most-reviewed">Most Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit">Apply Filters</Button>
        </form>
      )}

      {/* Clear filters link */}
      {(params.query || (params.discipline && params.discipline !== "all") || (params.status && params.status !== "all") || params.dateFrom || params.dateTo) && (
        <div className="flex items-center">
          <Link
            href="/papers"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}
