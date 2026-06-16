"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  X,
  User,
  Microscope,
  FileText,
  Star,
} from "lucide-react";

interface GettingStartedCardProps {
  userId: string;
}

export function GettingStartedCard({ userId }: GettingStartedCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = `aa-onboarding-dismissed-${userId}`;
    setDismissed(localStorage.getItem(key) === "true");
    setLoaded(true);
  }, [userId]);

  if (!loaded || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(`aa-onboarding-dismissed-${userId}`, "true");
    setDismissed(true);
  }

  const steps = [
    {
      icon: User,
      label: "Complete your profile",
      description: "Add your bio, institution, and avatar",
      href: "/settings",
    },
    {
      icon: Microscope,
      label: "Set your research areas",
      description: "So we can match you with papers to review",
      href: "/settings",
    },
    {
      icon: FileText,
      label: "Submit your first paper",
      description: "Publish your work for open peer review",
      href: "/papers/new",
    },
    {
      icon: Star,
      label: "Write your first review",
      description: "Find a paper in your area to review",
      href: "/papers",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Getting Started
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <step.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
