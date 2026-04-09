#!/usr/bin/env bash
# DockyDoc dev launcher — pulls latest, migrates, starts everything
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> Pulling latest code..."
git pull origin claude/build-dockydoc-saas-huU3N

echo "==> Starting database..."
docker compose up -d postgres

echo "==> Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U dockydoc -d dockydoc_dev -q 2>/dev/null; do
  sleep 1
done

echo "==> Installing API dependencies..."
cd "$ROOT/api" && npm install --silent

echo "==> Syncing database schema..."
./node_modules/.bin/prisma db push --accept-data-loss 2>/dev/null || \
  ./node_modules/.bin/prisma migrate deploy 2>/dev/null || true

echo "==> Seeding database (skips if already seeded)..."
./node_modules/.bin/prisma db seed 2>/dev/null || true

echo "==> Installing web dependencies..."
cd "$ROOT/web" && npm install --silent

echo ""
echo "Starting API on http://localhost:8081"
echo "Starting Web on http://localhost:8080"
echo "Press Ctrl+C to stop both."
echo ""

# Start API in background, web in foreground
cd "$ROOT/api" && npm run start:dev &
API_PID=$!

cd "$ROOT/web" && npm run dev &
WEB_PID=$!

# On Ctrl+C, kill both
trap "kill $API_PID $WEB_PID 2>/dev/null; exit 0" INT TERM

wait $API_PID $WEB_PID
