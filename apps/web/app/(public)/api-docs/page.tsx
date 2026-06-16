export const metadata = {
  title: "API Documentation",
  description: "Public REST API documentation for Academia Alexandria.",
};

const listExample = `{
  "data": [
    {
      "id": "clx1abc...",
      "title": "On the Computational Complexity of...",
      "abstract": "We present a novel approach...",
      "disciplines": ["computer-science", "mathematics"],
      "keywords": ["complexity", "algorithms"],
      "license": "CC-BY-4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
      "funding": null,
      "dataAvailability": null,
      "doi": null,
      "version": 1,
      "publishedAt": "2026-03-01T12:00:00.000Z",
      "createdAt": "2026-02-28T10:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z",
      "commentCount": 3,
      "reviewCount": 3,
      "endorsementCount": 1,
      "url": "https://academiaalexandria.org/papers/clx1abc...",
      "authors": [
        {
          "name": "Jane Smith",
          "order": 0,
          "isCorresponding": true,
          "contributions": ["CONCEPTUALIZATION", "METHODOLOGY"],
          "orcidId": "0000-0002-1234-5678",
          "institution": "MIT",
          "rorId": null
        }
      ]
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 3
}`;

const singleExample = `{
  "data": {
    "id": "clx1abc...",
    "title": "On the Computational Complexity of...",
    "abstract": "We present a novel approach...",
    ...
  }
}`;

export default function ApiDocsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="mt-2 text-muted-foreground">
          Academia Alexandria provides a REST API for programmatic access to
          papers. Read endpoints are public. Write endpoints require an API key
          (generate one in Settings &rarr; Developer).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Base URL</h2>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          https://academiaalexandria.org/api/v1
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="text-muted-foreground">
          Write endpoints require a Bearer token. Include your API key in the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            Authorization
          </code>{" "}
          header:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {`Authorization: Bearer aa_your_api_key_here`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Rate Limits</h2>
        <p className="text-muted-foreground">
          Read endpoints:{" "}
          <span className="font-medium text-foreground">
            60 requests per minute
          </span>{" "}
          per IP. Write endpoints:{" "}
          <span className="font-medium text-foreground">
            20 requests per minute
          </span>{" "}
          per API key. Exceeding limits returns a{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">429</code>{" "}
          response.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          GET <code className="text-lg">/api/v1/papers</code>
        </h2>
        <p className="text-muted-foreground">
          Returns a paginated list of submitted and published papers.
        </p>

        <h3 className="font-semibold">Query Parameters</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Parameter</th>
                <th className="pb-2 pr-4 font-semibold">Type</th>
                <th className="pb-2 pr-4 font-semibold">Default</th>
                <th className="pb-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>page</code>
                </td>
                <td className="py-2 pr-4">integer</td>
                <td className="py-2 pr-4">1</td>
                <td className="py-2">Page number</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>limit</code>
                </td>
                <td className="py-2 pr-4">integer</td>
                <td className="py-2 pr-4">20</td>
                <td className="py-2">Results per page (max 100)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>q</code>
                </td>
                <td className="py-2 pr-4">string</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2">
                  Search by title or abstract (case-insensitive)
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>discipline</code>
                </td>
                <td className="py-2 pr-4">string</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2">
                  Filter by discipline slug (e.g.,{" "}
                  <code>computer-science</code>)
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>keyword</code>
                </td>
                <td className="py-2 pr-4">string</td>
                <td className="py-2 pr-4">—</td>
                <td className="py-2">Filter by keyword</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>sort</code>
                </td>
                <td className="py-2 pr-4">string</td>
                <td className="py-2 pr-4">newest</td>
                <td className="py-2">
                  Sort order: <code>newest</code>, <code>oldest</code>,{" "}
                  <code>most-endorsed</code>, <code>most-reviewed</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-semibold">Response</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {listExample}
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          GET{" "}
          <code className="text-lg">{"/api/v1/papers/:paperId"}</code>
        </h2>
        <p className="text-muted-foreground">
          Returns a single paper by ID. Only submitted and published papers are
          accessible.
        </p>

        <h3 className="font-semibold">Response</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {singleExample}
        </pre>

        <h3 className="font-semibold">Response Codes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>200</code>
                </td>
                <td className="py-2">Success</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>400</code>
                </td>
                <td className="py-2">
                  Invalid query parameters (e.g., page &lt; 1, limit &gt; 100)
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>404</code>
                </td>
                <td className="py-2">Paper not found or not accessible</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>429</code>
                </td>
                <td className="py-2">Rate limit exceeded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr className="my-4" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          POST <code className="text-lg">/api/v1/papers</code>
        </h2>
        <p className="text-muted-foreground">
          Create a new draft paper. Requires authentication.
        </p>

        <h3 className="font-semibold">Request Body</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {`{
  "title": "My Paper Title",        // required
  "abstract": "Paper abstract...",   // optional
  "content": "Markdown content...",  // optional
  "disciplines": ["physics"],        // optional
  "keywords": ["quantum"]            // optional
}`}
        </pre>

        <h3 className="font-semibold">Response (201)</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {`{
  "data": {
    "id": "clx1abc...",
    "title": "My Paper Title",
    "status": "DRAFT",
    "createdAt": "2026-03-13T..."
  }
}`}
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          PATCH{" "}
          <code className="text-lg">{"/api/v1/papers/:paperId"}</code>
        </h2>
        <p className="text-muted-foreground">
          Update a draft paper. Only the paper&apos;s author can edit, and only
          while in DRAFT status. Requires authentication.
        </p>

        <h3 className="font-semibold">Request Body</h3>
        <p className="text-sm text-muted-foreground">
          Include only the fields you want to update. Same shape as{" "}
          <code>POST /api/v1/papers</code>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          POST{" "}
          <code className="text-lg">
            {"/api/v1/papers/:paperId/submit"}
          </code>
        </h2>
        <p className="text-muted-foreground">
          Submit a draft paper for peer review. The paper must meet all
          publication requirements (title, abstract, content or PDF, at least
          one discipline and keyword). Email verification required.
        </p>

        <h3 className="font-semibold">Response (200)</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {`{
  "data": {
    "id": "clx1abc...",
    "status": "SUBMITTED",
    "publishedAt": "2026-03-13T..."
  }
}`}
        </pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Webhooks</h2>
        <p className="text-muted-foreground">
          Configure webhooks in Settings &rarr; Developer to receive HTTP POST
          notifications when events occur. Each request includes an{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            X-Webhook-Signature
          </code>{" "}
          header (HMAC-SHA256 of the body using your webhook secret).
        </p>

        <h3 className="font-semibold">Available Events</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-semibold">Event</th>
                <th className="pb-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>paper.published</code>
                </td>
                <td className="py-2">A paper was accepted and published</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>paper.retracted</code>
                </td>
                <td className="py-2">A paper was retracted by an admin</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>review.submitted</code>
                </td>
                <td className="py-2">A new review was submitted</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">
                  <code>endorsement.received</code>
                </td>
                <td className="py-2">A paper received an endorsement</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="font-semibold">Payload</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {`{
  "event": "paper.published",
  "data": { "paperId": "clx1abc..." },
  "timestamp": "2026-03-13T12:00:00.000Z"
}`}
        </pre>
      </section>

      <hr className="my-4" />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Embeddable Badges</h2>
        <p className="text-muted-foreground">
          Display a paper&apos;s review status as an SVG badge on external sites,
          README files, or personal websites. No authentication required.
        </p>

        <h3 className="font-semibold">
          GET{" "}
          <code className="text-lg">
            {"/api/papers/:paperId/badge"}
          </code>
        </h3>
        <p className="text-muted-foreground">
          Returns an SVG image showing the paper&apos;s current status:
          &ldquo;peer reviewed&rdquo; (green) for published papers,
          &ldquo;X reviews&rdquo; (blue) for papers under review, or
          &ldquo;retracted&rdquo; (red).
        </p>

        <h3 className="font-semibold">Usage</h3>
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          {`<!-- HTML -->
<img src="https://academiaalexandria.org/api/papers/PAPER_ID/badge" alt="Review status" />

<!-- Markdown -->
![Review status](https://academiaalexandria.org/api/papers/PAPER_ID/badge)`}
        </pre>
      </section>
    </div>
  );
}
