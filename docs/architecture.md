# DockyDoc — Architecture Overview

## Design Principles

1. **Modular by default** — each feature (auth, users, workspaces, documents) is a self-contained NestJS module
2. **Multi-tenancy first** — every query is scoped to a `workspaceId` extracted from the JWT
3. **Audit-ready** — an `AuditLog` model will capture every write action (who, what, when)
4. **SSO-ready** — auth layer is designed to swap to Keycloak/OIDC with minimal changes
5. **No over-engineering** — no microservices, no event bus, no CQRS until the product needs it

---

## High-Level Architecture

```
┌─────────────────────────────────────────────┐
│                Browser / Client              │
│           Next.js 15 (App Router)            │
│         TypeScript + Tailwind CSS            │
└──────────────────────┬──────────────────────┘
                       │ HTTPS / REST
                       ▼
┌─────────────────────────────────────────────┐
│              NestJS API (Port 8081)          │
│                                             │
│  ┌─────────┐ ┌────────┐ ┌──────────────┐   │
│  │  Auth   │ │ Users  │ │  Workspaces  │   │
│  └─────────┘ └────────┘ └──────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │         Prisma ORM (PrismaService)   │   │
│  └──────────────────┬───────────────────┘   │
└─────────────────────┼───────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
   ┌─────────────┐        ┌─────────────┐
   │  PostgreSQL │        │    Redis    │
   │  (Primary)  │        │  (Cache /   │
   └─────────────┘        │   Sessions) │
                          └─────────────┘
```

---

## Folder Structure

```
dockydoc/
├── web/                          # Next.js frontend
│   └── src/
│       ├── app/                  # App Router pages
│       │   ├── (auth)/           # Route group: login, register
│       │   ├── (dashboard)/      # Route group: protected pages
│       │   └── layout.tsx        # Root layout
│       ├── components/
│       │   ├── auth/             # Auth-specific components
│       │   └── layout/           # Sidebar, Header
│       ├── lib/
│       │   ├── utils.ts          # cn() utility
│       │   └── api.ts            # API fetch client
│       ├── types/                # Shared TypeScript types
│       └── middleware.ts         # Route protection
│
├── api/                          # NestJS backend
│   ├── prisma/
│   │   └── schema.prisma         # Prisma schema
│   └── src/
│       ├── main.ts               # Bootstrap (CORS, pipes, Swagger)
│       ├── app.module.ts         # Root module
│       ├── config/               # Typed env configuration
│       ├── prisma/               # PrismaService + PrismaModule
│       ├── health/               # Health check endpoint
│       ├── common/
│       │   ├── filters/          # Global HTTP exception filter
│       │   └── interceptors/     # Logging interceptor
│       └── modules/
│           ├── auth/             # Login, logout, token refresh
│           ├── users/            # User CRUD
│           └── workspaces/       # Workspace management
│
└── docs/                         # This documentation
```

---

## Multi-Tenancy Design

Every resource in DockyDoc belongs to a **Workspace** (the tenant).

```
User ──┐
       ├── WorkspaceMember (role: OWNER | ADMIN | MEMBER | VIEWER)
       │
Workspace ──── Documents
           ──── AuditLogs
```

- JWT payload includes `{ sub: userId, workspaceId, role }`
- A `CurrentUser` decorator extracts this from the request in every controller
- Prisma queries always include `where: { workspaceId: user.workspaceId }`

---

## Authentication Flow

```
Client                  API
  │                      │
  ├── POST /auth/login ──►│
  │                      ├── Validate credentials (DB)
  │                      ├── Sign JWT (access: 7d)
  │◄── { accessToken } ──┤
  │                      │
  ├── GET /documents ────►│ (Authorization: Bearer <token>)
  │                      ├── JwtAuthGuard validates token
  │                      ├── CurrentUser decorator injects user
  │◄── [documents] ───────┤
```

**Future SSO (Keycloak):**
- Replace `POST /auth/login` with OIDC redirect
- NestJS validates Keycloak-issued JWTs via JWKS endpoint
- No code changes needed in controllers — only swap the Passport strategy

---

## API Conventions

| Convention | Detail |
|-----------|--------|
| Base URL | `/api/v1` |
| Auth | `Authorization: Bearer <JWT>` |
| Error shape | `{ statusCode, message, error, timestamp, path }` |
| Pagination | `?page=1&pageSize=20` |
| Soft deletes | `deletedAt` timestamp (no hard deletes) |
| Audit trail | Every write is logged to `AuditLog` table |

---

## Planned Phases

| Phase | Features |
|-------|---------|
| 1 (current) | Foundation: auth, users, workspaces, Prisma setup |
| 2 | Document upload, storage (S3/MinIO), versioning |
| 3 | AI features: summarization, search, classification |
| 4 | SSO (Keycloak/OIDC), advanced RBAC |
| 5 | Audit log UI, compliance exports, webhooks |
