"use client";

import { useActionState } from "react";
import { completeOrcidRegistration, type AuthActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CompleteProfileFormProps {
  token: string;
  name: string;
  orcidId: string;
}

export function CompleteProfileForm({ token, name, orcidId }: CompleteProfileFormProps) {
  const [state, formAction, isPending] = useActionState<
    AuthActionResult,
    FormData
  >(async (_prev, formData) => completeOrcidRegistration(formData), {});

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Complete your profile</CardTitle>
        <CardDescription>
          Your ORCID iD ({orcidId}) has been verified. Just add your email to
          finish creating your account.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="token" value={token} />
        <CardContent className="space-y-4">
          {state?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={name}
              required
              minLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@university.edu"
              required
            />
            <p className="text-xs text-muted-foreground">
              Used for notifications and account recovery. Not shared publicly.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary underline">
              Sign in with email
            </a>{" "}
            first, then link ORCID from Settings.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
