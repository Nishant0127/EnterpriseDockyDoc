# DockyDoc

**Secure, AI-powered document management platform for enterprises.**

## Project Structure

```
dockydoc/
├── web/          → Next.js 15 frontend (App Router + TypeScript)
├── api/          → NestJS backend (modular, TypeScript)
├── docs/         → Architecture and setup documentation
└── docker-compose.yml  → Local PostgreSQL + Redis
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- pnpm (recommended) or npm

### 1. Start infrastructure
```bash
docker compose up -d
```

### 2. Set up the API
```bash
cd api
cp .env.example .env
npm install
npx prisma generate
npm run start:dev
```
API runs at: http://localhost:3001

### 3. Set up the Web
```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```
Web runs at: http://localhost:3000

## Verify it works
- Web: http://localhost:3000 → redirects to `/login`
- API health: http://localhost:3001/health
- API docs: http://localhost:3001/api/docs (Swagger)

## Documentation
- [Architecture Overview](docs/architecture.md)
- [Setup Guide](docs/setup.md)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 16, Prisma ORM |
| Cache | Redis 7 |
| Auth | JWT (→ Keycloak/OIDC ready) |
