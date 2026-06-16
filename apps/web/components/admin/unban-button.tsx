"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { unbanUser } from "@/actions/admin";
import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export function UnbanButton({ userId, userName }: { userId: string; userName: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleUnban() {
    setIsPending(true);
    const result = await unbanUser(userId);
    setIsPending(false);

    if ("error" in result) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }

    toast({ title: `${userName} has been unbanned`, variant: "success" });
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleUnban} disabled={isPending}>
      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
      {isPending ? "Unbanning..." : "Unban User"}
    </Button>
  );
}
