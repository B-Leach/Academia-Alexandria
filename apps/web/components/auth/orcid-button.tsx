"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface OrcidButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export function OrcidButton({ onClick, loading }: OrcidButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
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
      Continue with ORCID
    </Button>
  );
}
