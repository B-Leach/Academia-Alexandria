import Link from "next/link";
import { prisma } from "@academia-alexandria/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  BookOpen,
  Eye,
  Shield,
  Users,
  Coins,
  TrendingUp,
  ArrowRight,
  Check,
  X,
  FileText,
  MessageSquare,
  GraduationCap,
  FlaskConical,
  Lightbulb,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Publish Freely",
    description:
      "Share your research immediately. No submission fees, no paywalls, no gatekeepers. Your work is public the moment you're ready.",
  },
  {
    icon: Eye,
    title: "Transparent Peer Review",
    description:
      "Every review is public. Structured rubrics ensure consistency. The community can see exactly how a paper was evaluated.",
  },
  {
    icon: Users,
    title: "Community-Driven",
    description:
      "Anyone can comment. Verified academics can submit formal reviews. Established experts can endorse papers they trust.",
  },
  {
    icon: Coins,
    title: "Review Bounties",
    description:
      "Optionally attach a bounty to your paper to incentivize faster reviews. 90% goes directly to reviewers. No one is required to pay.",
  },
  {
    icon: TrendingUp,
    title: "Build Your Reputation",
    description:
      "Your profile tracks everything: papers, reviews, endorsements, reputation score. A living academic identity you own.",
  },
  {
    icon: Shield,
    title: "Open Source",
    description:
      "The entire platform is open source. No corporate ownership. No profit motive. Built by and for the academic community.",
  },
];

const comparisons = [
  { old: "$2,000+ submission fees", new: "Free to publish" },
  { old: "6–18 month review cycles", new: "Immediate publication" },
  { old: "Reviews hidden from public", new: "Transparent peer review" },
  { old: "Knowledge behind paywalls", new: "Free to read, forever" },
  { old: "Reputation is opaque", new: "Transparent reputation scores" },
];

export default async function LandingPage() {
  const [papersCount, reviewsCount, usersCount] = await Promise.all([
    prisma.paper.count({ where: { status: "PUBLISHED" } }),
    prisma.review.count(),
    prisma.user.count(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 py-24 text-center sm:py-32">
          <Badge variant="secondary" className="mb-6">
            Free & Open Source
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Academic publishing,
            <br />
            <span className="text-muted-foreground">as it should be</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Publish openly, get reviewed transparently, and build your reputation
            on merit. With optional bounties that incentivize faster reviews,
            your research reaches the community in days, not months.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/papers">Browse papers</Link>
            </Button>
          </div>
        </section>

        {/* Stats — only show when there's meaningful activity */}
        {papersCount + reviewsCount + usersCount >= 10 && (
          <section className="border-y border-border">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-4 py-16 sm:flex-row sm:gap-16">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{papersCount}</span>
                <span className="text-sm text-muted-foreground">
                  Papers Published
                </span>
              </div>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{reviewsCount}</span>
                <span className="text-sm text-muted-foreground">
                  Reviews Written
                </span>
              </div>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{usersCount}</span>
                <span className="text-sm text-muted-foreground">
                  Researchers Joined
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-24">
            <h2 className="text-center text-3xl font-bold">
              Built different, on purpose
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Traditional academic publishing charges thousands to publish,
              takes months for review, and keeps knowledge behind paywalls. We
              built the opposite.
            </p>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="space-y-3 rounded-xl border border-border bg-card p-6 transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-24">
            <h2 className="text-center text-3xl font-bold">
              A better model for academic publishing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              See how Academia Alexandria compares to the traditional publishing
              process.
            </p>
            <div className="mx-auto mt-16 max-w-3xl">
              <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
                <div className="text-sm font-semibold text-muted-foreground">
                  Traditional Publishing
                </div>
                <div className="text-sm font-semibold">
                  Academia Alexandria
                </div>
              </div>
              {comparisons.map((item) => (
                <div
                  key={item.old}
                  className="grid grid-cols-2 gap-4 border-b border-border py-4"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4 shrink-0 text-destructive/70" />
                    <span className="line-through">{item.old}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span>{item.new}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-24">
            <h2 className="text-center text-3xl font-bold">How it works</h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  1
                </div>
                <Badge variant="outline" className="mt-4">
                  Step 1
                </Badge>
                <h3 className="mt-3 font-semibold">Publish your paper</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Write directly on the platform or upload a PDF. Add your
                  metadata and publish. It&apos;s live immediately.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  2
                </div>
                <Badge variant="outline" className="mt-4">
                  Step 2
                </Badge>
                <h3 className="mt-3 font-semibold">Get reviewed</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  The community leaves comments and formal reviews. Optionally
                  add a bounty to incentivize faster, more reviews.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  3
                </div>
                <Badge variant="outline" className="mt-4">
                  Step 3
                </Badge>
                <h3 className="mt-3 font-semibold">Build credibility</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reviews, endorsements, and engagement create a transparent
                  credibility signal. Your profile becomes your living academic
                  identity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who Is This For? */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-24">
            <h2 className="text-center text-3xl font-bold">
              Built for researchers who want better
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Traditional publishing underserves the people it was built for.
              We&apos;re changing that.
            </p>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FlaskConical className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Early-Career Researchers</h3>
                <p className="text-sm text-muted-foreground">
                  Publish without paying thousands in fees. Build a transparent
                  track record of papers, reviews, and endorsements from day one.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Interdisciplinary Work</h3>
                <p className="text-sm text-muted-foreground">
                  Research that falls between journal scopes gets stuck in limbo.
                  Here, any paper can be reviewed by qualified experts across
                  disciplines.
                </p>
              </div>
              <div className="space-y-3 rounded-xl border border-border bg-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Institutions</h3>
                <p className="text-sm text-muted-foreground">
                  Track your researchers&apos; output, save on publishing fees,
                  and support a publishing model that puts knowledge first.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Quote */}
        <section>
          <div className="mx-auto max-w-7xl px-4 py-24 text-center">
            <blockquote className="mx-auto max-w-2xl">
              <p className="text-xl italic text-muted-foreground">
                &ldquo;If I have seen further, it is by standing on the
                shoulders of giants.&rdquo;
              </p>
              <footer className="mt-4 text-sm text-muted-foreground">
                — Isaac Newton
              </footer>
            </blockquote>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-24 text-center">
            <h2 className="text-3xl font-bold">
              Knowledge should be free
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Join a growing community of researchers who believe that sharing
              ideas shouldn&apos;t be behind a paywall. Attempts to improve
              humanity and its knowledge should be free and simple.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/register">
                Create your free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
