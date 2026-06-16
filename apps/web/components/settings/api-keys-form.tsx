"use client";

import { useState, useEffect, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createApiKey, listApiKeys, revokeApiKey } from "@/actions/api-keys";
import { Loader2, Copy, Trash2, Key } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export function ApiKeysForm() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      const result = await listApiKeys();
      setKeys(result);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const [, createAction, isCreating] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const name = formData.get("name") as string;
      const result = await createApiKey(name);
      if ("error" in result) {
        toast({ title: result.error, variant: "destructive" });
        return null;
      }
      toast({ title: "API key created", variant: "success" });
      setNewKey(result.key!);
      loadKeys();
      return null;
    },
    null,
  );

  const handleRevoke = async (keyId: string) => {
    const result = await revokeApiKey(keyId);
    if ("error" in result) {
      toast({ title: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "API key revoked", variant: "success" });
    loadKeys();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", variant: "success" });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading API keys...
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
      {newKey && (
        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
            Save this key now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-sm">
              {newKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(newKey)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <form action={createAction} className="flex items-end gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="key-name">Key Name</Label>
          <Input
            id="key-name"
            name="name"
            placeholder="e.g. CI/CD pipeline"
            required
            maxLength={100}
          />
        </div>
        <Button type="submit" disabled={isCreating}>
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Key
        </Button>
      </form>

      {keys.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
          <Key className="h-8 w-8" />
          <p>No API keys yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  <code>{key.keyPrefix}...</code>
                  {" · "}
                  Created {formatDate(key.createdAt)}
                  {key.lastUsedAt && (
                    <>
                      {" · "}
                      Last used {formatDate(key.lastUsedAt)}
                    </>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(key.id)}
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
