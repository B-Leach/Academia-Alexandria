import {
  ClipboardCheck,
  CheckCircle2,
  Award,
  DollarSign,
  Scale,
  ExternalLink,
  Code,
} from "lucide-react";

export const metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about Academia Alexandria, peer review, bounties, and more.",
};

export default function FaqPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <p className="mt-2 text-muted-foreground">
          Common questions about using Academia Alexandria.
        </p>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            How does peer review work?
          </h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Academia Alexandria uses open peer review. When a paper is submitted,
          any researcher whose expertise overlaps with the paper&apos;s
          discipline can write a review. Reviews are structured around a rubric
          covering methodology, novelty, clarity, reproducibility, and ethics,
          each scored 1&ndash;10. All reviews are public and attributed to their
          authors, promoting accountability and transparency.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            What makes a review &ldquo;qualifying&rdquo;?
          </h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          A review qualifies when the reviewer&apos;s research areas overlap
          with at least one of the paper&apos;s disciplines. The reviewer must
          also have a verified email address. Each text field (summary,
          strengths, weaknesses) must be at least 100 characters. Only
          qualifying reviews count toward the acceptance threshold.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            How does a paper get accepted?
          </h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          A paper needs three qualifying reviews that all rate it as
          &ldquo;Sound.&rdquo; Once this threshold is met, a 5-day verification
          period begins. During this window, the community can flag concerns or
          report issues. If no unresolved reports remain after the cool-off, the
          paper is automatically published. Moderators can intervene at any point
          if problems are raised.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">How do bounties work?</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Authors can optionally attach a bounty to their paper to incentivize
          timely review. When a bounty is active, 90% of the amount is
          distributed equally among qualifying reviewers, regardless of their
          recommendation. The remaining 10% supports platform operations.
          Reviewers are paid for thoughtful evaluation, not favorable ratings.
          Bounty payments are processed through Stripe Connect.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">
            What licenses are available?
          </h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Authors choose a Creative Commons license at submission time. Options
          include CC-BY-4.0, CC-BY-SA-4.0, and CC-BY-NC-4.0. Authors retain
          full copyright of their work. All peer reviews are licensed under
          CC-BY-4.0. The platform code itself is licensed under the GNU Affero
          General Public License v3.0 (AGPL-3.0).
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Do I need an ORCID?</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          An ORCID iD is not required. You can register with an email and
          password and use the platform fully. However, linking your ORCID from
          Settings helps verify your researcher identity and allows you to sign
          in with ORCID. Your ORCID iD will appear on your public profile and in
          API responses for papers you author.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Is there an API?</h2>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          Yes. Academia Alexandria provides a public REST API for programmatic
          access to published and submitted papers. No authentication is
          required. The API is rate-limited to 60 requests per minute per IP
          address. See the{" "}
          <a
            href="/api-docs"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            API documentation
          </a>{" "}
          for endpoints, query parameters, and response formats.
        </p>
      </section>
    </div>
  );
}
