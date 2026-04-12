# DockyDoc — Deployment Guide

Stack: **Vercel** (frontend) · **Render** (backend) · **Neon** (database) · **Clerk** (auth)

---

## Branch Strategy

| Branch | Purpose | Auto-deploys to |
|---|---|---|
| `main` | Production-ready code | Vercel production · Render production |
| `develop` | Integration branch | Vercel preview · Render staging |
| `feature/*` / `claude/*` | In-progress work | Vercel preview per push |

Rules:
- Never push breaking changes directly to `main`
- Merge `develop` → `main` only when staging is verified
- Always commit new Prisma migrations alongside the schema change

---

## 1 — Neon: Database Setup

Create **two Neon branches** in your Neon project:

| Neon branch | Used by |
|---|---|
| `main` (or `production`) | Render production service |
| `staging` | Render staging service |

Each branch has its own connection string. Copy them from the Neon dashboard.

> Neon branches are cheap, isolated, and safe to reset on staging without touching production data.

---

## 2 — Render: Backend Deployment

### First-time setup

1. Create a new **Web Service** in Render from the GitHub repo.
2. Set **Root Directory** → `api`
3. Set **Build Command** → `npm install && npm run build && npx prisma generate`
4. Set **Start Command** → `npx prisma migrate deploy && node dist/main`
5. Set **Health Check Path** → `/api/v1/health`
6. Repeat to create a second service for staging.

### Environment variables (set in Render dashboard)

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `DATABASE_URL` | yes | Neon production connection string |
| `CORS_ORIGINS` | yes | `https://app.yourdomain.com` (no trailing slash) |
| `SHARE_GRANT_SECRET` | yes | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | yes | `openssl rand -hex 32` |
| `CLERK_SECRET_KEY` | yes | `sk_live_...` from Clerk dashboard |
| `JWT_SECRET` | yes | `openssl rand -hex 32` |
| `REDIS_URL` | optional | Only if Redis caching is enabled |
| `STORAGE_PROVIDER` | optional | `s3` for production file storage |
| `ANTHROPIC_API_KEY` etc. | optional | AI providers |

For the **staging** service, use:
- `DATABASE_URL` → Neon `staging` branch connection string
- `CORS_ORIGINS` → `https://dockydoc-git-develop-yourteam.vercel.app` (Vercel preview URL for `develop` branch)
- `CLERK_SECRET_KEY` → `sk_test_...` (Clerk test/dev instance)

### Prisma migrations on Render

The start command runs `prisma migrate deploy` before the app starts. This applies any committed but unapplied migrations automatically on each deploy. No manual migration step is needed.

> `prisma migrate deploy` (safe) applies pending migrations.
> `prisma migrate dev` (dev only) can create and reset — never run this in production.

---

## 3 — Vercel: Frontend Deployment

### First-time setup

1. Import the repo in Vercel.
2. Set **Root Directory** → `web`
3. Framework will be auto-detected as Next.js.

### Environment variables (set in Vercel dashboard)

Set these for **production** environment:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://dockydoc-api.onrender.com` (your Render service URL) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` from Clerk |
| `CLERK_SECRET_KEY` | `sk_live_...` from Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |

For the **preview** environment (staging), use:
- `NEXT_PUBLIC_API_URL` → staging Render URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → `pk_test_...`
- `CLERK_SECRET_KEY` → `sk_test_...`

> `NEXT_PUBLIC_*` vars are baked into the bundle at build time. If you change
> the API URL or Clerk keys, you must trigger a redeploy for it to take effect.

---

## 4 — Clerk: Auth Setup

Clerk has two separate **instances**: a **Development** instance (used locally and for staging) and a **Production** instance (used for live users).

| Clerk instance | Keys start with | Used for |
|---|---|---|
| Development | `pk_test_` / `sk_test_` | Local dev + staging |
| Production | `pk_live_` / `sk_live_` | Production only |

Steps for production:
1. In Clerk dashboard, create or switch to the **Production** instance.
2. Add your production domain (e.g. `app.yourdomain.com`) under **Domains**.
3. Copy the live keys → set in Vercel production environment + Render production service.

> Never put live Clerk keys in `.env.local` or commit them to git.

---

## 5 — Prisma Migration Workflow

### During development

```bash
# After editing prisma/schema.prisma:
cd api
npx prisma migrate dev --name describe_your_change
npx prisma generate
# Commit the generated migration file in api/prisma/migrations/
git add api/prisma/migrations/
git commit -m "feat: add <your migration description>"
```

### On staging / production (automatic)

Render's start command runs `npx prisma migrate deploy` on every deploy. Any committed migrations not yet applied to the database are applied in order.

### Manual deploy (emergency)

```bash
DATABASE_URL="<connection_string>" npx prisma migrate deploy
```

> Never run `prisma migrate reset` against staging or production — it drops all data.

---

## 6 — Verifying a Deploy

After each deploy, confirm:

1. **Health check**: `GET https://your-api.onrender.com/api/v1/health`
   - Expected: `{ "status": "ok", "info": { "database": { "status": "up" } } }`

2. **Frontend loads**: visit the Vercel URL, confirm login works.

3. **API connectivity**: open browser devtools Network tab, confirm requests go to the correct Render URL (not localhost).

---

## 7 — Safe Development After Go-Live

- All new feature work happens on `feature/*` or `claude/*` branches.
- Merge into `develop` for staging review.
- Only merge `develop` → `main` when staging is verified working.
- Never merge directly to `main` without a staging test.
- New Prisma migrations are always committed as part of the feature branch.
