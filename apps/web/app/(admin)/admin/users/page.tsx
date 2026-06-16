import { getAdminUsers } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BulkUsersTable } from "@/components/admin/bulk-users-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Admin - Users",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { users, totalCount, totalPages, currentPage } = await getAdminUsers(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-2 text-muted-foreground">
          {totalCount} {totalCount === 1 ? "user" : "users"} registered.
        </p>
      </div>

      {/* Search */}
      <form className="flex gap-4" method="GET">
        <Input
          name="query"
          placeholder="Search by name or email..."
          defaultValue={params.query ?? ""}
          className="max-w-sm"
        />
        <Button type="submit">Search</Button>
        {params.query && (
          <Button variant="ghost" asChild>
            <Link href="/admin/users">Clear</Link>
          </Button>
        )}
      </form>

      <BulkUsersTable users={users} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={{ pathname: "/admin/users", query: { ...params, page: currentPage - 1 } }}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={{ pathname: "/admin/users", query: { ...params, page: currentPage + 1 } }}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
