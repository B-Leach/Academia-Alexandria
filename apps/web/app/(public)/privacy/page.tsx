export const metadata = {
  title: "Privacy Policy",
  description: "How Academia Alexandria collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: March 12, 2026
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Data We Collect</h2>
        <p className="leading-relaxed text-muted-foreground">
          When you create an account, we collect your name, email address, and a
          hashed version of your password. You may optionally provide your
          institution, bio, research areas, honorific, and ORCID identifier. If
          you upload papers, we store the manuscript files and associated
          metadata (title, abstract, keywords, disciplines, and licensing
          information).
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Reviews, comments, endorsements, and reputation events are stored and
          associated with your account. If you use review bounties, payment
          information is processed and stored by Stripe — we do not store credit
          card numbers or bank details on our servers.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How We Store Your Data</h2>
        <p className="leading-relaxed text-muted-foreground">
          Account data and platform content are stored in a PostgreSQL database.
          Uploaded files (paper manuscripts, avatars) are stored in
          S3-compatible object storage. Passwords are hashed using bcrypt and are
          never stored in plaintext. All data is transmitted over HTTPS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Third-Party Services</h2>
        <p className="leading-relaxed text-muted-foreground">
          We use the following third-party services:
        </p>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Stripe</span> —
            Payment processing for review bounties. Subject to{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Stripe&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <span className="font-medium text-foreground">ORCID</span> —
            Optional identity verification for researchers. Subject to{" "}
            <a
              href="https://info.orcid.org/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              ORCID&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <span className="font-medium text-foreground">
              S3-compatible storage
            </span>{" "}
            — File storage for uploaded manuscripts and avatars.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Cookies</h2>
        <p className="leading-relaxed text-muted-foreground">
          We use a single session cookie to keep you signed in. We do not use
          tracking cookies, analytics cookies, or advertising cookies. No
          third-party tracking scripts are loaded on our pages.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Your Rights</h2>
        <p className="leading-relaxed text-muted-foreground">
          You can update or delete your profile information at any time from your
          account settings. If you wish to delete your account entirely or
          request a copy of your data, please contact us at the address below.
          Published papers and reviews may be retained for scholarly record, but
          your personal identifying information can be removed upon request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="leading-relaxed text-muted-foreground">
          For privacy-related questions or data requests, contact us at{" "}
          <a
            href="mailto:privacy@academiaalexandria.org"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            privacy@academiaalexandria.org
          </a>
          .
        </p>
      </section>
    </div>
  );
}
