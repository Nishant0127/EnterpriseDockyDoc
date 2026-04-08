# DockyDoc — Setup Guide

Complete local development setup from zero to running.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | https://nodejs.org |
| npm | 10+ | Bundled with Node |
| Docker | Latest | https://docker.com |
| Docker Compose | V2 | Bundled with Docker Desktop |
| Git | Any | https://git-scm.com |

---

## Step 1 — Clone the repository

```bash
git clone <repo-url> dockydoc
cd dockydoc
```

---

## Step 2 — Start the database

PostgreSQL and Redis run in Docker. This keeps your machine clean.

```bash
docker compose up -d
```

Verify containers are healthy:
```bash
docker compose ps
```

You should see both `dockydoc_postgres` and `dockydoc_redis` with status `healthy`.

---

## Step 3 — Set up the API

```bash
cd api

# Copy and edit environment variables
cp .env.example .env
# Edit .env if needed (defaults work for local Docker setup)

# Install dependencies
npm install

# Generate Prisma client (must run after any schema change)
npx prisma generate

# Start in development mode (hot reload)
npm run start:dev
```

**Verify the API:**
- Health: http://localhost:8081/api/v1/health → `{ "status": "ok" }`
- Swagger: http://localhost:8081/api/docs

---

## Step 4 — Set up the web

Open a **new terminal**:

```bash
cd web

# Copy environment variables
cp .env.local.example .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

**Verify the web:**
- http://localhost:8080 → redirects to http://localhost:8080/login

---

## Step 5 — Verify everything works

| Check | URL | Expected |
|-------|-----|---------|
| Web app loads | http://localhost:8080/login | Login page |
| Dashboard shell | http://localhost:8080/dashboard | Dashboard layout |
| API health | http://localhost:8081/api/v1/health | `{"status":"ok"}` |
| Swagger UI | http://localhost:8081/api/docs | API documentation |

---

## Database Migrations & Seeding

### Run the initial migration

```bash
cd api
npx prisma migrate dev --name init_users_workspaces
```

This creates the tables: `users`, `workspaces`, `workspace_users`.

### Seed sample data

```bash
cd api
npm run db:seed
```

This inserts realistic sample data:

| Entity | Detail |
|--------|--------|
| Enterprise workspace | **Acme Corporation** (slug: `acme-corp`) |
| → alice@acmecorp.com | OWNER |
| → bob@acmecorp.com | ADMIN |
| → carol@acmecorp.com | EDITOR |
| Personal workspace | **Dave's Workspace** (slug: `dave-personal`) |
| → dave@personal.com | OWNER |

The seed is idempotent — safe to run multiple times (uses `upsert`).

### Other database commands

```bash
npm run db:migrate   # Create + apply migration interactively
npm run db:seed      # Run seed script
npm run db:studio    # Open Prisma Studio (visual DB browser at localhost:5555)
npm run db:reset     # ⚠ Drop all data and re-run migrations + seed
```

### Open Prisma Studio (visual browser)
```bash
cd api
npx prisma studio
# Opens at http://localhost:5555
```

---

## Common Commands

### API
```bash
npm run start:dev    # Start with hot reload
npm run build        # Compile TypeScript
npm run type-check   # Check types without building
npm run lint         # Run ESLint
npm test             # Run tests
npm run db:migrate   # Create and apply Prisma migration
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
```

### Web
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run type-check   # Check types
npm run lint         # Run ESLint
```

### Docker
```bash
docker compose up -d       # Start all services
docker compose down        # Stop all services
docker compose down -v     # Stop and delete volumes (wipes DB!)
docker compose logs -f     # Tail all service logs
```

---

## Troubleshooting

### "Can't connect to database"
1. Check Docker is running: `docker compose ps`
2. Check the `DATABASE_URL` in `api/.env` matches docker-compose values
3. Wait ~10s for postgres to be fully ready, then restart the API

### "Module not found" in API
```bash
cd api && npm install && npx prisma generate
```

### "CORS error" in browser
Check that `CORS_ORIGINS` in `api/.env` includes `http://localhost:8080`.

### Port conflicts
- API uses port `8081` — change `PORT` in `api/.env`
- Web uses port `8080` — change with `npm run dev -- -p 8082`
- PostgreSQL uses port `5432` — change in `docker-compose.yml`
