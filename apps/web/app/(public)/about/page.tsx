import { BookOpen, Users, Scale, GitBranch } from "lucide-react";

export const metadata = {
  title: "About",
  description:
    "Learn about Academia Alexandria, an open-source academic publishing platform.",
};

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">About Academia Alexandria</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Free and open academic publishing for everyone.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Our Mission</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Academia Alexandria is an open-source academic publishing platform
          built on the belief that knowledge should be freely accessible. We
          eliminate the barriers of traditional academic publishing — no
          submission fees, no paywalls, no gatekeepers. Researchers publish
          directly, and the community decides what constitutes sound scholarship
          through transparent peer review.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">How It Works</h2>
        </div>
        <div className="space-y-3 text-muted-foreground">
          <p className="leading-relaxed">
            <span className="font-medium text-foreground">Publish.</span>{" "}
            Authors submit their work as markdown or PDF. Papers are immediately
            visible to the community and open for review. Blind submission is
            available for authors who prefer anonymous review.
          </p>
          <p className="leading-relaxed">
            <span className="font-medium text-foreground">Review.</span>{" "}
            Qualified reviewers — researchers whose expertise overlaps with the
            paper&apos;s discipline — evaluate the work using a structured
            rubric covering methodology, novelty, clarity, reproducibility, and
            ethics. Every review is public and attributed, promoting
            accountability.
          </p>
          <p className="leading-relaxed">
            <span className="font-medium text-foreground">Accept.</span> A paper
            is marked as peer-reviewed once it receives three qualifying reviews
            that all rate it as methodologically sound. There is a 5-day
            verification period before publication to allow for community flags.
            Acceptance is based on soundness, not novelty or perceived impact.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Review Bounties</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Authors can attach optional bounties to their papers to incentivize
          timely review. When a bounty is active, 90% of the amount is
          distributed equally among qualifying reviewers, regardless of their
          recommendation. The remaining 10% supports platform operations. Bounty
          payments never influence the review outcome — reviewers are paid for
          thoughtful evaluation, not favorable ratings.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Open Source</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Academia Alexandria is licensed under the{" "}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            GNU Affero General Public License v3.0
          </a>
          . The entire codebase is publicly available. Institutions and research
          groups are free to self-host their own instances. We believe the
          infrastructure of scholarly communication should be owned by the
          community it serves, not locked behind proprietary platforms.
        </p>
      </section>
    </div>
  );
}
