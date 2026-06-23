# HelpHub

Support-ticketing monorepo: Express + TypeScript backend, Next.js 14 (App Router) frontend, shared Zod-schema package.

## Setup

```bash
# Prerequisites: Node >=20, pnpm >=9, Postgres >=14, Redis >=7

git clone <repo-url>
cd helphub
pnpm install

cp .env.example .env          # edit DATABASE_URL / JWT_SECRET
cp apps/web/.env.local.example apps/web/.env.local   # or just set NEXT_PUBLIC_API_URL

# Start infrastructure
brew services start postgresql@14
brew services start redis

# Create database
createdb helphub
psql -d helphub -c "CREATE USER helphub WITH PASSWORD 'helphub';"
psql -d helphub -c "GRANT ALL ON SCHEMA public TO helphub;"

# Run migrations
psql -d helphub -f apps/api/src/db/migrations/0001_init.sql
psql -d helphub -f apps/api/src/db/migrations/0002_tickets.sql
psql -d helphub -f apps/api/src/db/migrations/0003_comments_sla.sql

# Seed demo accounts
pnpm -F @helphub/api seed

# Start both API (port 4000) and Web (port 3000)
pnpm dev

# Or start individually:
pnpm -F @helphub/api dev    # API only
pnpm -F @helphub/web dev    # Web only

# Run tests
pnpm -F @helphub/api test

# Run worker (separate terminal)
pnpm -F @helphub/api worker
```

**Demo accounts** (password: `Password123!`):
- `customer@helphub.test` — can create/view own tickets, add comments
- `agent@helphub.test` — can claim tickets, transition states, add internal notes
- `admin@helphub.test` — full access to all tickets and operations

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         apps/web (Next.js 14)                    │
│  ┌───────────┐  ┌──────────────┐  ┌───────────────────────────┐ │
│  │ Zustand   │  │ TanStack     │  │ Pages (App Router):       │ │
│  │ auth store│──│ React Query  │──│ /login /register          │ │
│  │ (JWT+user)│  │ (cached API) │  │ /tickets /tickets/[id]    │ │
│  └───────────┘  └──────┬───────┘  │ /tickets/new              │ │
│                        │          └───────────────────────────┘ │
└────────────────────────┼────────────────────────────────────────┘
                         │ HTTP (fetch + Bearer JWT)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     apps/api (Express 4 + TS)                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │ Tickets   │  │ Comments │  │ SLA + Worker  │  │
│  │ routes → │  │ routes →  │  │ routes → │  │ (BullMQ,      │  │
│  │ service  │  │ service   │  │ service  │  │  separate     │  │
│  │ (bcrypt, │  │ (Zod +    │  │ (Zod +   │  │  process)     │  │
│  │  JWT)    │  │  state    │  │  comment │  │               │  │
│  │          │  │  machine) │  │  repo)   │  │               │  │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │             │                 │          │
│       └──────────────┼─────────────┼─────────────────┘          │
│                      │             │                            │
│              ┌───────▼─────────────▼──────┐                     │
│              │    Drizzle ORM + Postgres  │                     │
│              │    (users, tickets,         │                     │
│              │     comments tables)        │                     │
│              └───────────┬────────────────┘                     │
│                          │                                      │
│              ┌───────────▼────────────┐                         │
│              │  Redis (rate limit +   │                         │
│              │         BullMQ)        │                         │
│              └────────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘

                         ▲                                        
                         │                                        
              ┌──────────┴──────────┐                             
              │  packages/shared     │                             
              │  (Zod schemas,       │                             
              │   state machine,     │                             
              │   inferred types)    │                             
              └─────────────────────┘                              
```

Data flow: Browser → Next.js pages → `apiFetch()` wrapper (attaches JWT from Zustand, 401→redirect login) → Express middleware (verifyJWT, rate-limit, requireRole) → controller (Zod parse) → service (business logic, AppError classes) → repository (Drizzle queries with role-scoped SQL visibility predicates) → Postgres. Redis used for rate-limit counters and BullMQ job queue (SLA breach checker runs in a separate worker process every 60s).

## Library Choices

| Library | Why |
|---------|-----|
| **Express 4** | Minimal, well-understood HTTP framework; no hidden magic |
| **Drizzle ORM** | SQL-like query builder with full type safety; no N+1 surprises |
| **Postgres** | Mature relational DB with great JSON support for audit trails |
| **Redis** | Fast in-memory store for rate-limit counters and BullMQ queue |
| **BullMQ** | Redis-backed job scheduler with repeatable jobs and graceful shutdown |
| **Zod** | Single source of truth for request/response shapes shared between API+frontend |
| **JWT (HS256) + bcrypt** | Stateless auth with cost-12 password hashing |
| **Next.js 14 (App Router)** | React server components + client components; file-based routing |
| **TanStack React Query** | Declarative server-state caching with automatic refetch |
| **Zustand** | Minimal global store for auth state; no boilerplate |
| **Tailwind CSS** | Utility-first CSS; no runtime, consistent design tokens |
| **Vitest** | Fast test runner with native TypeScript support |
| **pnpm workspaces** | Strict dependency isolation between packages |

## Trade-offs & Known Gaps

- **No refresh token rotation.** JWT expires in 24 h, user must re-login. Acceptable for this scope; next step would be a refresh-token table with rotation on use.
- **Rate limiter is fixed-window, not sliding-log.** Allows up to 2× burst at window boundaries (e.g., 5 requests at :59 and 5 more at :00). Chosen for simplicity (single INCR+EXPIRE); a Redis sorted-set sliding log is the documented upgrade path.
- **No idempotency key on ticket creation.** Duplicate POSTs can create duplicate tickets. Mitigated for now by client-side button disabling. An idempotency-key table (idempotency_key, response, expires_at) is the fix.
- **Forward-fix only (no down migrations).** Migration files are SQL `CREATE TABLE` / `ALTER TABLE` only. Reverting requires manual SQL. Acceptable for dev-phase iteration; a proper migration tool (node-pg-migrate, Atlas) would add rollback support.
- **401 error codes are split.** Auth middleware returns `UNAUTHORIZED` while login failure returns `INVALID_CREDENTIALS`. Both are 401 but carry different codes. Unified to `UNAUTHORIZED` would be more consistent; the split allows frontends to differentiate "not logged in" from "wrong password."
- **No database-level cascading deletes.** Hard deletes are not used; if added, cascades must be wired explicitly.
- **Worker is a separate process.** SLA breach polling runs outside the API server. Works for single-replica deployments; for horizontal scaling the BullMQ scheduler should run exactly once (e.g., sole replica or external cron).
