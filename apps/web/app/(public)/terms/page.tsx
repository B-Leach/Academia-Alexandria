export const metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Academia Alexandria.",
};

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 12, 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Acceptable Use</h2>
        <p className="leading-relaxed text-muted-foreground">
          Academia Alexandria is a platform for scholarly communication. By using
          this platform, you agree to:
        </p>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>Submit only original work or work you have the right to share</li>
          <li>
            Not engage in plagiarism, data fabrication, or misrepresentation of
            authorship
          </li>
          <li>
            Provide honest, constructive peer reviews based on academic merit
          </li>
          <li>
            Treat other users with respect — harassment, discrimination, and
            personal attacks are prohibited
          </li>
          <li>
            Not use the platform for spam, advertising, or purposes unrelated to
            academic research
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Content Licensing</h2>
        <p className="leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Papers.</span> Authors
          retain copyright to their work and choose a license at the time of
          submission (e.g., CC-BY-4.0, CC-BY-SA-4.0, CC-BY-NC-4.0). The
          selected license governs how others may use the work. By submitting a
          paper, you grant Academia Alexandria a non-exclusive license to host
          and distribute it according to your chosen terms.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Reviews.</span> Peer
          reviews submitted on this platform are licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            CC-BY-4.0
          </a>
          . This ensures transparency and allows the scholarly community to
          reference and build upon review discourse.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Platform code.</span>{" "}
          The Academia Alexandria software is licensed under the{" "}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            GNU Affero General Public License v3.0
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Account Termination</h2>
        <p className="leading-relaxed text-muted-foreground">
          We reserve the right to suspend or terminate accounts that violate
          these terms. Moderators may ban users for repeated or severe
          violations, including plagiarism, harassment, or abuse of the review
          system. Banned users will be notified with a reason for the action.
          Published scholarly work is not removed upon account termination unless
          it violates these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Review Bounties</h2>
        <p className="leading-relaxed text-muted-foreground">
          Review bounties are voluntary payments made by authors to incentivize
          peer review. Bounty payouts are processed through Stripe. By
          participating in the bounty system, you agree to Stripe&apos;s terms
          of service. Bounties are paid for qualifying reviews regardless of the
          reviewer&apos;s recommendation — payment does not imply or require a
          favorable review.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Limitation of Liability</h2>
        <p className="leading-relaxed text-muted-foreground">
          Academia Alexandria is provided &ldquo;as is&rdquo; without warranties
          of any kind. We are not responsible for the accuracy, completeness, or
          reliability of content submitted by users. We do not guarantee
          uninterrupted access to the platform. Our liability is limited to the
          maximum extent permitted by applicable law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Changes to These Terms</h2>
        <p className="leading-relaxed text-muted-foreground">
          We may update these terms from time to time. Significant changes will
          be communicated through the platform. Continued use of Academia
          Alexandria after changes take effect constitutes acceptance of the
          revised terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="leading-relaxed text-muted-foreground">
          For questions about these terms, contact us at{" "}
          <a
            href="mailto:legal@academiaalexandria.org"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            legal@academiaalexandria.org
          </a>
          .
        </p>
      </section>
    </div>
  );
}
