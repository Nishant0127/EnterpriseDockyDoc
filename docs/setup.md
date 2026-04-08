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
- Health: http://localhost:3001/api/v1/health → `{ "status": "ok" }`
- Swagger: http://localhost:3001/api/docs

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
- http://localhost:3000 → redirects to http://localhost:3000/login

---

## Step 5 — Verify everything works

| Check | URL | Expected |
|-------|-----|---------|
| Web app loads | http://localhost:3000/login | Login page |
| Dashboard shell | http://localhost:3000/dashboard | Dashboard layout |
| API health | http://localhost:3001/api/v1/health | `{"status":"ok"}` |
| Swagger UI | http://localhost:3001/api/docs | API documentation |

---

## Database Migrations

Once you add models to `api/prisma/schema.prisma`:

```bash
# Create and apply a migration
cd api
npx prisma migrate dev --name add_users_table

# Open Prisma Studio (visual DB browser)
npx prisma studio
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
Check that `CORS_ORIGINS` in `api/.env` includes `http://localhost:3000`.

### Port conflicts
- API uses port `3001` — change `PORT` in `api/.env`
- Web uses port `3000` — change with `npm run dev -- -p 3002`
- PostgreSQL uses port `5432` — change in `docker-compose.yml`
