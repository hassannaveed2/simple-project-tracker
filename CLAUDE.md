# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A personal project/task tracker (not a Jira/Asana competitor). Full product spec lives in
`prompt.md` at the repo root — read it before making product decisions. Two core entities:
**Project** (a thing you're working on) and **Task** (belongs to exactly one Project). The app
is single-user-scoped: every Project/Task/Activity row belongs to an authenticated User, and a
user must never see another user's data.

Guardrails from the spec (do not violate without explicit user request):
- No teams, workspaces, permissions, roles, chat, real-time collab, Gantt charts, sprints, or
  story points. This is a personal tool, not enterprise PM software.
- Project `progress` is never stored — always computed from the ratio of completed/total tasks.
- Activity log is intentionally lightweight (task/project created/completed/priority-changed
  type events) — not a full audit system.

## Tech stack (locked decisions)

- Next.js 15.x, App Router, TypeScript, `src/` layout
- Tailwind CSS + shadcn/ui — use the CLI pinned to `shadcn@3.8.5` for any `init`/`add`, not
  `@latest`. Newer major versions (4.x) default to a "Base UI"-backed style whose registry has
  gaps (e.g. `form` has no files yet, silently no-ops). `3.8.5` is the last release with the
  classic `new-york` style and a complete Radix-based component set.
- Prisma ORM **v5** (`prisma` and `@prisma/client` pinned to the 5.x line) — deliberately not v6
- Neon Postgres for both dev and prod (same connection string architecture, no local Postgres).
  Note: `prisma init` crashes on Node.js 25.x (`Error: (0 , CSe.isError) is not a function`, a bug
  in its update-check network call) — create `prisma/schema.prisma` and `.env` by hand instead.
  `format`/`validate`/`generate`/`migrate dev` are all unaffected. See "Neon connectivity on this
  machine" below if `migrate dev`/`db seed`/`dev` hang trying to reach the database.
- Auth.js v5 (`next-auth@beta`), Credentials provider only (email/password; Google OAuth is
  optional/deferred), no `@auth/prisma-adapter` (not needed for Credentials — see the Phase 1
  design doc), **JWT session strategy** (required because Credentials provider is incompatible
  with database sessions), `bcryptjs` for password hashing (pure JS, no native build step —
  matters for Vercel's serverless functions)
- Zod for validation, React Hook Form for forms
- dnd-kit (`@dnd-kit/core` only, not `sortable` — no persisted manual ordering) for drag-and-drop
  between Kanban columns. Always pass a stable `id` prop to `DndContext` — its internal
  `aria-describedby` id counter is module-level state that persists across requests in the same
  Node process but resets on the client, causing an SSR hydration mismatch without it.
- Sonner for toasts, Lucide React for icons
- next-themes for light/dark/system mode
- npm as the package manager

Server Components are the default; Client Components only where interaction is required. Mutations
go through Server Actions in `actions/`, not API routes, except where a route handler is required
(e.g. Auth.js's own endpoints).

## Planned architecture

```
app/
  (dashboard)/        # authenticated shell: sidebar + main content
    page.tsx           # Dashboard (greeting, stats, today's tasks, upcoming, recent projects)
    projects/
      [id]/             # Project Details — Kanban/grouped task view, dnd-kit
    today/
    upcoming/
    completed/
    settings/
  auth/
    login/
    register/
components/
  dashboard/  projects/  tasks/  layout/  ui/   # ui/ = shadcn primitives
actions/
  projects.ts   tasks.ts   activity.ts          # Server Actions, one file per entity
lib/
  db.ts         # Prisma client singleton
  auth.ts       # Auth.js config
  validations/  # Zod schemas
  utils/
prisma/
  schema.prisma
  seed.ts
```

Route protection is enforced in middleware (redirect unauthenticated requests to `/auth/login`),
not per-page checks. Every Server Action that touches Project/Task/Activity data must scope its
Prisma query by the current session's `userId` — there is no separate authorization layer, so this
is the actual security boundary.

### Data model

Four models: `User`, `Project`, `Task`, `Activity`. Task belongs to exactly one Project and one
User (denormalized `userId` on Task for query/index simplicity, even though it's reachable via
Project). Required indexes: `Task.userId`, `Task.projectId`, `Task.status`, `Task.priority`,
`Task.dueDate`, `Project.userId`. Schema changes go through `prisma migrate dev` — never hand-edit
the database schema.

## Build phases

The spec (`prompt.md`, bottom section) defines a 13-phase incremental build order (setup → schema →
Projects CRUD → Tasks CRUD → Project Details → drag-and-drop → Dashboard → Today/Upcoming → search
& filters → activity → dark mode/responsive → polish → deploy). Each phase should build and be
verified working before the next one starts; reuse components/utilities from prior phases instead
of duplicating them.

## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check without emitting
- `npm test` — run Vitest once
- `npm run test:watch` — run Vitest in watch mode
- `npx prisma migrate dev --name <name>` — create and apply a migration
- `npx prisma db seed` — run `prisma/seed.ts` (use `npx`, not the raw `node_modules/.bin/prisma`
  path — the seed command spawns `tsx`, which needs `node_modules/.bin` on `PATH`, and only `npx`
  guarantees that)
- `npx prisma migrate reset` — drop, re-migrate, and re-seed the dev database
- `npx prisma studio` — browse the database in a GUI

Demo login after seeding: `demo@example.com` / `password123`.

### Neon connectivity on this machine

Earlier in this project, this machine's IPv6 default route appeared stale/non-functional (a
router-advertised link-local gateway that didn't forward packets), and `getaddrinfo` returned
IPv6 addresses first for Neon's hostname, so raw TCP connections (Prisma, `pg`, etc.) hung until
timeout. The workaround at the time was connecting via Neon's IPv4 address directly plus an
`options=endpoint=<id>` connection parameter (Neon's documented mechanism for clients that can't
rely on SNI-based routing), kept entirely inside `.env`.

**As of 2026-09-22, this is no longer needed** — re-tested via `getent hosts <host>` (still
resolves IPv6 first), raw `/dev/tcp` connects to both the hostname and an explicit IPv6 address,
and a full `npx prisma db execute` round trip, all of which succeeded over IPv6 without the
workaround. `.env` now uses Neon's plain pooled/direct hostnames directly
(`<endpoint>-pooler.<region>.aws.neon.tech` / `<endpoint>.<region>.aws.neon.tech`), matching
`.env.example`. The router/network condition apparently changed since the original diagnosis;
`ping6` to Neon's IPv6 addresses still fails, but that's ICMP being filtered somewhere on the
path, not a routing problem — real TCP traffic on port 5432 goes through fine.

If connections start hanging again, re-run the same diagnostic: `getent hosts <host>` (IPv6) vs
`getent ahostsv4 <host>` (IPv4) plus a raw `/dev/tcp` connect test on each, to confirm whether
IPv6 has actually broken again before falling back to the IPv4+`options=endpoint=` workaround
described in this project's git history (`git log -p -- .env.example`) or `.env.example`'s
comments.

### `migrate dev` refuses to run non-interactively for risky changes

`prisma migrate dev` (even with `--create-only`) hard-refuses in a non-interactive shell as soon as
it needs to show a confirmation prompt — e.g. adding a unique constraint that *could* fail against
existing duplicate data (`Error: Prisma Migrate has detected that the environment is
non-interactive`). Work around it without ever touching `migrate dev`'s interactive path:

1. Generate the raw SQL yourself: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`. **Never pass `--shadow-database-url` pointed at `$DIRECT_URL` or `$DATABASE_URL`** — a shadow database is scratch space Prisma creates, replays migration history into, diffs, and drops; pointing it at the real database has, on this project, wiped every table's rows (schema survived, data didn't — recoverable in principle via Neon's point-in-time restore, but don't rely on that). Omit the flag entirely and let Prisma create its own temporary shadow database automatically.
2. Write that output into a new `prisma/migrations/<timestamp>_<name>/migration.sql` by hand
3. Apply it with `npx prisma migrate deploy` — `deploy` never prompts, by design (it's meant for
   CI/non-interactive use)

Separately: on this project, `_prisma_migrations` (Prisma's own bookkeeping table) has been
observed to go missing from the database even after a `migrate deploy` reported success — the
actual schema changes persist, but the tracking table doesn't, so a later `migrate deploy` fails
with `P3005: The database schema is not empty`. If that happens and you've confirmed (via
`information_schema.columns`/`pg_indexes`) that earlier migrations' effects are genuinely already
present: baseline them with `npx prisma migrate resolve --applied <migration_name>` for each
already-applied one (oldest first — this recreates `_prisma_migrations` and marks them done
without re-running their SQL), then run `npx prisma migrate deploy` again to actually execute
whichever migration is still genuinely pending.
