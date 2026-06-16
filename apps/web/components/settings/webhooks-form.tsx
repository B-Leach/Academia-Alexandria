"use client";

import { useState, useEffect, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWebhook, listWebhooks, deleteWebhook } from "@/actions/webhooks";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { Loader2, Copy, Trash2, Webhook } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: Date;
}

export function WebhooksForm() {
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadWebhooks = async () => {
    try {
      const result = await listWebhooks();
      setWebhooks(result);
    } catch {
      setError("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebhooks();
  }, []);

  const [, createAction, isCreating] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const url = formData.get("url") as string;
      if (selectedEvents.length === 0) {
        toast({ title: "Select at least one event", variant: "destructive" });
        return null;
      }
      const result = await createWebhook(url, selectedEvents);
      if ("error" in result) {
        toast({ title: result.error, variant: "destructive" });
        return null;
      }
      toast({ title: "Webhook created", variant: "success" });
      setNewSecret(result.secret!);
      setSelectedEvents([]);
      loadWebhooks();
      return null;
    },
    null,
  );

  const handleDelete = async (webhookId: string) => {
    const result = await deleteWebhook(webhookId);
    if ("error" in result) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Webhook deleted", variant: "success" });
    loadWebhooks();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", variant: "success" });
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading webhooks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {newSecret && (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
            Save this signing secret now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-muted px-3 py-2 text-sm">
              {newSecret}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(newSecret)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setNewSecret(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <form action={createAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Endpoint URL</Label>
          <Input
            id="webhook-url"
            name="url"
            type="url"
            placeholder="https://example.com/webhooks"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Events</Label>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((event) => (
              <button
                key={event}
                type="button"
                onClick={() => toggleEvent(event)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedEvents.includes(event)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:border-primary/50"
                }`}
              >
                {event}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isCreating}>
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Webhook
        </Button>
      </form>

      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <Webhook className="h-8 w-8" />
          <p>No webhooks configured.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{wh.url}</p>
                <div className="flex flex-wrap gap-1">
                  {wh.events.map((e) => (
                    <span
                      key={e}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(wh.createdAt)}
                  {!wh.active && " · Inactive"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(wh.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
