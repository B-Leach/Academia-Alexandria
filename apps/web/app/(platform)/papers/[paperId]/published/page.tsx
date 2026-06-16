import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaper } from "@/actions/paper";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Confetti } from "@/components/papers/confetti";
import { ArrowRight, BookOpen, PartyPopper } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const paper = await getPaper(paperId);
  return { title: paper ? `Submitted: ${paper.title}` : "Paper Submitted" };
}

export default async function PaperSubmittedPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const [paper, session] = await Promise.all([getPaper(paperId), auth()]);

  if (!paper || (paper.status !== "SUBMITTED" && paper.status !== "PUBLISHED")) {
    notFound();
  }

  const isAuthor = paper.authors.some((a) => a.userId === session?.user?.id);
  if (!isAuthor) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl py-12 text-center space-y-8">
      <Confetti />
      <div className="space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <PartyPopper className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold">Your paper has been submitted!</h1>
        <p className="text-muted-foreground">
          Your work is now publicly visible and open for peer review. Once it
          receives qualifying reviews, it will be marked as peer reviewed.
        </p>
      </div>

      <Card>
        <CardContent className="py-8 space-y-4">
          <h2 className="text-xl font-semibold leading-snug">{paper.title}</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {paper.disciplines.map((d) => (
              <Badge key={d} variant="secondary">
                {d.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {paper.abstract}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={`/papers/${paper.id}`}>
            <BookOpen className="mr-2 h-4 w-4" />
            View Your Paper
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/papers">
            <ArrowRight className="mr-2 h-4 w-4" />
            Browse Papers
          </Link>
        </Button>
      </div>
    </div>
  );
}
