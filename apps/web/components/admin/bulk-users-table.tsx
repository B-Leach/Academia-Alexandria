"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { BulkActionBar } from "@/components/admin/bulk-action-bar";
import { bulkBanUsers, bulkUnbanUsers } from "@/actions/admin";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  reputationScore: number;
  createdAt: Date;
  bannedAt: Date | null;
}

export function BulkUsersTable({ users }: { users: User[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkBan = () => {
    startTransition(async () => {
      const result = await bulkBanUsers([...selected], banReason);
      if (result.error) {
        toast({ title: result.error, variant: "destructive" });
      } else {
        toast({ title: `Banned ${result.count} users`, variant: "success" });
        setSelected(new Set());
        router.refresh();
      }
      setBanOpen(false);
      setBanReason("");
    });
  };

  const handleBulkUnban = () => {
    startTransition(async () => {
      const result = await bulkUnbanUsers([...selected]);
      if (result.error) {
        toast({ title: result.error, variant: "destructive" });
      } else {
        toast({ title: `Unbanned ${result.count} users`, variant: "success" });
        setSelected(new Set());
        router.refresh();
      }
    });
  };

  return (
    <>
      <BulkActionBar
        selectedCount={selected.size}
        actions={[
          { label: isPending ? "Processing..." : "Ban Selected", variant: "destructive", onClick: () => setBanOpen(true) },
          { label: "Unban Selected", onClick: handleBulkUnban },
        ]}
        onClear={() => setSelected(new Set())}
      />

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban {selected.size} users?</DialogTitle>
            <DialogDescription>
              The selected users will be banned from the platform. They will not
              be able to log in or interact with any content.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for ban..."
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkBan} disabled={isPending}>
              {isPending ? "Banning..." : "Ban Users"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={users.length > 0 && selected.size === users.length}
                  onChange={toggleAll}
                  aria-label="Select all users"
                  className="rounded border-input"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Reputation</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={`border-b transition-colors hover:bg-muted/30 ${selected.has(user.id) ? "bg-muted/20" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(user.id)}
                    onChange={() => toggle(user.id)}
                    aria-label={`Select ${user.name}`}
                    className="rounded border-input"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {user.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  {user.role === "ADMIN" ? (
                    <Badge className="bg-purple-500/10 text-purple-700">Admin</Badge>
                  ) : user.role === "MODERATOR" ? (
                    <Badge className="bg-blue-500/10 text-blue-700">Moderator</Badge>
                  ) : (
                    <Badge variant="secondary">User</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{user.reputationScore}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-3">
                  {user.bannedAt ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge className="bg-green-500/10 text-green-700">Active</Badge>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
