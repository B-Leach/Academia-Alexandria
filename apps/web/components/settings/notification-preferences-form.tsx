"use client";

import { useActionState } from "react";
import {
  updateNotificationPreferences,
  type ProfileActionResult,
} from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface NotificationPreferencesFormProps {
  preferences: {
    notifyReviews: boolean;
    notifyComments: boolean;
    notifyEndorsements: boolean;
    notifyPaperStatus: boolean;
    notifyBounty: boolean;
    notifyInvitations: boolean;
  };
}

const NOTIFICATION_OPTIONS = [
  {
    key: "notifyReviews" as const,
    label: "Reviews",
    description: "Email me when someone reviews my paper",
  },
  {
    key: "notifyComments" as const,
    label: "Comments",
    description:
      "Email me when someone comments on my paper or replies to my comment",
  },
  {
    key: "notifyEndorsements" as const,
    label: "Endorsements",
    description: "Email me when someone endorses my paper",
  },
  {
    key: "notifyPaperStatus" as const,
    label: "Paper status",
    description: "Email me when my paper is accepted",
  },
  {
    key: "notifyBounty" as const,
    label: "Bounties",
    description: "Email me about bounty payouts",
  },
  {
    key: "notifyInvitations" as const,
    label: "Co-author invitations",
    description:
      "Email me when I'm invited as co-author or when invitees respond",
  },
];

export function NotificationPreferencesForm({
  preferences,
}: NotificationPreferencesFormProps) {
  const [values, setValues] = useState(preferences);

  const [state, formAction, isPending] = useActionState<
    ProfileActionResult,
    FormData
  >(async (_prev, formData) => {
    return updateNotificationPreferences(formData);
  }, {});

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          Notification preferences saved.
        </div>
      )}

      <div className="space-y-4">
        {NOTIFICATION_OPTIONS.map((option) => (
          <div
            key={option.key}
            className="flex items-center justify-between gap-4"
          >
            <div className="space-y-0.5">
              <Label htmlFor={option.key}>{option.label}</Label>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <Switch
              id={option.key}
              checked={values[option.key]}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, [option.key]: checked }))
              }
            />
            <input
              type="hidden"
              name={option.key}
              value={values[option.key] ? "on" : "off"}
            />
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Preferences
      </Button>
    </form>
  );
}
