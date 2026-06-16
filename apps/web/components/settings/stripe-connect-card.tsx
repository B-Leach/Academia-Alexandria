"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Loader2, AlertCircle, DollarSign } from "lucide-react";

interface ConnectStatus {
  connected: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

interface PendingPayouts {
  count: number;
  totalCents: number;
}

export function StripeConnectCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayouts | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/stripe/connect/status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          if (data.connected && data.pendingPayouts) {
            setPendingPayouts(data.pendingPayouts);
          }
        }
      } catch {
        // Status check failed — will show default state
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to start Stripe onboarding");
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert("Failed to connect to Stripe");
    } finally {
      setConnecting(false);
    }
  }

  async function handleClaimPayouts() {
    setClaiming(true);
    try {
      const res = await fetch("/api/stripe/claim-payout", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.claimed > 0) {
          setPendingPayouts(null);
          alert(`Successfully claimed ${data.claimed} payout(s) totaling $${(data.totalCents / 100).toFixed(2)}`);
        } else {
          alert("No pending payouts to claim");
        }
      }
    } catch {
      alert("Failed to claim payouts");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Stripe status...
      </div>
    );
  }

  // Not connected
  if (!status?.connected) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your Stripe account to receive bounty payouts for peer reviews.
        </p>
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="mr-2 h-4 w-4" />
          )}
          Connect Stripe
        </Button>
      </div>
    );
  }

  // Connected but not fully verified
  if (!status.chargesEnabled || !status.detailsSubmitted) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Stripe account setup incomplete
            </p>
            <p className="text-sm text-muted-foreground">
              Please complete your Stripe account verification to receive payouts.
            </p>
          </div>
        </div>
        <Button onClick={handleConnect} disabled={connecting} variant="outline">
          {connecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="mr-2 h-4 w-4" />
          )}
          Complete Setup
        </Button>
      </div>
    );
  }

  // Fully connected
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <p className="text-sm font-medium text-green-700 dark:text-green-400">
          Stripe account connected
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        You can receive bounty payouts for peer reviews.
      </p>

      {/* Pending payouts */}
      {pendingPayouts && pendingPayouts.count > 0 && (
        <div className="rounded-md border border-blue-500/50 bg-blue-500/10 p-3">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
            You have {pendingPayouts.count} pending payout{pendingPayouts.count > 1 ? "s" : ""}{" "}
            (${(pendingPayouts.totalCents / 100).toFixed(2)})
          </p>
          <Button
            onClick={handleClaimPayouts}
            disabled={claiming}
            size="sm"
            className="mt-2"
          >
            {claiming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <DollarSign className="mr-2 h-4 w-4" />
            )}
            Claim Payouts
          </Button>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
        {connecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-2 h-4 w-4" />
        )}
        Manage Stripe Account
      </Button>
    </div>
  );
}
