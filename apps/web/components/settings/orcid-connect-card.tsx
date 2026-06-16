"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Loader2, Unlink } from "lucide-react";
import { disconnectOrcid } from "@/actions/profile";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface OrcidConnectCardProps {
  orcidId: string | null;
}

export function OrcidConnectCard({ orcidId }: OrcidConnectCardProps) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    await signIn("orcid", { redirectTo: "/settings?tab=accounts" });
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const result = await disconnectOrcid();
    if (result.error) {
      toast({ title: result.error, variant: "destructive" });
      setDisconnecting(false);
      return;
    }
    router.refresh();
    setDisconnecting(false);
  }

  if (orcidId) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a6ce39]/10">
            <svg
              className="h-5 w-5"
              viewBox="0 0 256 256"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M256 128C256 198.7 198.7 256 128 256C57.3 256 0 198.7 0 128C0 57.3 57.3 0 128 0C198.7 0 256 57.3 256 128Z"
                fill="#A6CE39"
              />
              <path
                d="M86.3 186.2H70.9V79.1H86.3V186.2ZM108.9 79.1H150.5C190.2 79.1 207.6 107.4 207.6 132.9C207.6 164.4 184.4 186.2 151.4 186.2H108.9V79.1ZM124.3 172.4H148.8C178 172.4 191.6 153.2 191.6 132.8C191.6 108.5 174.9 92.9 150.1 92.9H124.3V172.4ZM78.6 64.1C84 64.1 88.4 59.7 88.4 54.3C88.4 48.9 84 44.5 78.6 44.5C73.2 44.5 68.8 48.9 68.8 54.3C68.8 59.7 73.2 64.1 78.6 64.1Z"
                fill="white"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#a6ce39]" />
              <p className="text-sm font-medium">ORCID connected</p>
            </div>
            <a
              href={`https://orcid.org/${orcidId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              {orcidId}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Unlink className="mr-2 h-4 w-4" />
          )}
          Disconnect ORCID
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <svg
            className="h-5 w-5 opacity-50"
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M256 128C256 198.7 198.7 256 128 256C57.3 256 0 198.7 0 128C0 57.3 57.3 0 128 0C198.7 0 256 57.3 256 128Z"
              fill="#A6CE39"
            />
            <path
              d="M86.3 186.2H70.9V79.1H86.3V186.2ZM108.9 79.1H150.5C190.2 79.1 207.6 107.4 207.6 132.9C207.6 164.4 184.4 186.2 151.4 186.2H108.9V79.1ZM124.3 172.4H148.8C178 172.4 191.6 153.2 191.6 132.8C191.6 108.5 174.9 92.9 150.1 92.9H124.3V172.4ZM78.6 64.1C84 64.1 88.4 59.7 88.4 54.3C88.4 48.9 84 44.5 78.6 44.5C73.2 44.5 68.8 48.9 68.8 54.3C68.8 59.7 73.2 64.1 78.6 64.1Z"
              fill="white"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">ORCID</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Link your ORCID iD to verify your researcher identity and display it on your profile.
          </p>
        </div>
      </div>
      <Button onClick={handleConnect} disabled={connecting}>
        {connecting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg
            className="mr-2 h-4 w-4"
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M256 128C256 198.7 198.7 256 128 256C57.3 256 0 198.7 0 128C0 57.3 57.3 0 128 0C198.7 0 256 57.3 256 128Z"
              fill="#A6CE39"
            />
            <path
              d="M86.3 186.2H70.9V79.1H86.3V186.2ZM108.9 79.1H150.5C190.2 79.1 207.6 107.4 207.6 132.9C207.6 164.4 184.4 186.2 151.4 186.2H108.9V79.1ZM124.3 172.4H148.8C178 172.4 191.6 153.2 191.6 132.8C191.6 108.5 174.9 92.9 150.1 92.9H124.3V172.4ZM78.6 64.1C84 64.1 88.4 59.7 88.4 54.3C88.4 48.9 84 44.5 78.6 44.5C73.2 44.5 68.8 48.9 68.8 54.3C68.8 59.7 73.2 64.1 78.6 64.1Z"
              fill="white"
            />
          </svg>
        )}
        Link ORCID iD
      </Button>
    </div>
  );
}
