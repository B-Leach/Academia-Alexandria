#!/bin/bash
set -e

echo "Setting up test database..."

# Find the postgres container
CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
if [ -z "$CONTAINER" ]; then
  echo "Error: No running postgres container found. Start it with:"
  echo "  docker compose -f docker/docker-compose.yml up -d postgres"
  exit 1
fi

# Create the test database via docker exec
docker exec "$CONTAINER" psql -U alexandria -d alexandria \
  -c "DROP DATABASE IF EXISTS alexandria_test;" \
  -c "CREATE DATABASE alexandria_test;"

echo "Test database created."

# Run migrations against the test database
export DATABASE_URL="postgresql://alexandria:alexandria@localhost:5432/alexandria_test?schema=public"

echo "Running migrations..."
cd "$(dirname "$0")/../packages/database"
npx prisma migrate deploy

echo "Seeding research areas..."
npx prisma db seed

echo "Test database setup complete."
