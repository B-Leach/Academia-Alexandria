# Academia Alexandria

Open-source academic publishing platform. Free to publish, free to read, with community-driven peer review.

## What is this?

Academia Alexandria is a web-based platform where researchers can publish papers, receive peer reviews, and build academic reputation — without paywalls or publishing fees. Think of it as a community-run alternative to traditional academic journals.

**Key features:**

- Publish papers in Markdown or PDF, with versioning and co-authorship
- Community peer review with structured rubrics and reputation tracking
- Endorsements from established researchers
- Optional review bounties via Stripe Connect
- ORCID integration for researcher identity
- On-demand PDF generation with branded cover pages
- Public REST API for paper metadata

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** Auth.js v5 with credential and ORCID providers
- **UI:** Tailwind CSS v4 + Radix UI primitives
- **Storage:** S3-compatible (MinIO for local dev, any S3/R2 provider in production)
- **Payments:** Stripe Connect (optional)
- **Monorepo:** Turborepo + pnpm

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local Postgres and MinIO)

### Setup

```bash
# Clone and install
git clone https://github.com/B-Leach/Academia-Alexandria.git
cd Academia-Alexandria
pnpm install

# Start local services (Postgres, MinIO, Redis)
docker compose -f docker/docker-compose.yml up -d

# Copy environment file and fill in your values
cp .env.example .env

# Run database migrations and seed data
pnpm db:migrate
pnpm db:seed

# Start the dev server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Dev seed data

For a pre-populated development environment with sample users, papers, and reviews:

```bash
pnpm db:seed:dev
```

### Running Tests

```bash
# Unit tests (runs ~380 tests)
pnpm test

# Integration tests (requires test database)
pnpm test:setup    # Create test database
pnpm test:integration
```

## Project Structure

```
apps/
  web/                 # Next.js application
    actions/           # Server actions
    app/               # App Router pages and API routes
    components/        # React components
    lib/               # Utilities, validators, services
packages/
  database/            # Prisma schema, migrations, seed scripts
  shared/              # Shared constants (disciplines, reputation rules, rubrics)
  tsconfig/            # Shared TypeScript configs
  email/               # Email templates (planned)
docker/                # Docker Compose for local dev services
```

## Environment Variables

See [`.env.example`](.env.example) for the full list. At minimum you need:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Random secret for session encryption (`openssl rand -base64 32`)
- `AUTH_URL` — Your app's public URL

Optional services (features degrade gracefully when not configured):
- `S3_*` — File storage for paper PDFs and avatars
- `STRIPE_*` — Bounty/payment features
- `AUTH_ORCID_*` — ORCID login
- `RESEND_API_KEY` — Email notifications

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

This means you're free to use, modify, and distribute the code, but any modifications to the server-side code must also be made available under the same license — even when running as a network service.
