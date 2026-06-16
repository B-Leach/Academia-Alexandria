#!/bin/sh
set -e

echo "==> Running Prisma migrations..."
npx prisma migrate deploy --schema ./packages/database/prisma/schema.prisma

echo "==> Seeding database (if needed)..."
npx prisma db seed --schema ./packages/database/prisma/schema.prisma || true

echo "==> Starting application..."
exec "$@"
