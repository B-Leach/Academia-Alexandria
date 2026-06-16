"use client";

import { useActionState } from "react";
import { changePassword, type AuthActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface SecurityFormProps {
  hasPassword: boolean;
}

export function SecurityForm({ hasPassword }: SecurityFormProps) {
  const [state, formAction, isPending] = useActionState<
    AuthActionResult,
    FormData
  >(async (_prev, formData) => {
    return await changePassword(formData);
  }, {});

  if (!hasPassword) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Your account uses ORCID sign-in and does not have a password set. You
          can set a password using the forgot password flow.
        </p>
        <Button variant="outline" asChild>
          <Link href="/forgot-password">Set a Password</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          Password changed successfully.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters, one uppercase letter, and one number.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
        <Input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          required
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Change Password
      </Button>
    </form>
  );
}
