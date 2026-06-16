# Contributing to Academia Alexandria

Thanks for your interest in contributing! This document covers the development setup and guidelines.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+ (`corepack enable` then `corepack prepare pnpm@latest --activate`)
- Docker and Docker Compose

### First-time setup

```bash
# Install dependencies
pnpm install

# Start local services
docker compose -f docker/docker-compose.yml up -d

# Copy and configure environment
cp .env.example .env
# Edit .env — at minimum set AUTH_SECRET (run: openssl rand -base64 32)

# Set up database
pnpm db:migrate
pnpm db:seed

# Start dev server
pnpm dev
```

### MinIO (S3) setup

If you're working on file upload features, create the storage bucket after MinIO starts:

1. Open the MinIO console at `http://localhost:9001` (login: `minioadmin` / `minioadmin`)
2. Create a bucket named `papers`
3. Set the bucket's access policy to `public` (for read access to uploaded files)

## Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (need a separate test database)
pnpm test:setup
pnpm test:integration

# Watch mode for development
cd apps/web && pnpm test:watch
```

## Project Conventions

### Code style

- TypeScript strict mode throughout
- Tailwind CSS for styling (no CSS modules or styled-components)
- Server actions for mutations (in `apps/web/actions/`)
- Prisma for all database access

### Naming

- `camelCase` for functions and variables
- `PascalCase` for React components and types
- `kebab-case` for file names

### Commits

Write clear commit messages. No specific format is enforced, but keep them descriptive.

### Testing

- Unit tests live next to the code they test or in `__tests__/` directories
- Integration tests are in `apps/web/__tests__/integration/`
- New server actions and library functions should have tests

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Run `pnpm test` and `pnpm lint` to verify nothing is broken
4. Open a PR with a clear description of the change

## Reporting Issues

Open an issue on GitHub. Include steps to reproduce the problem and any relevant error messages or screenshots.

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
