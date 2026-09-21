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
- dnd-kit for drag-and-drop (kept deliberately minimal — simple Kanban reordering only)
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

Not yet established — no `package.json` exists yet (Phase 1 scaffolding is in progress). Update
this section with the actual `dev`/`build`/`lint`/`prisma migrate`/`prisma db seed` commands once
the project is scaffolded.

### Neon connectivity on this machine

This machine's IPv6 default route is stale/non-functional (a router-advertised link-local gateway
that doesn't actually forward packets), but `getaddrinfo` still returns IPv6 addresses first for
Neon's hostname, so any raw TCP connection (Prisma, `pg`, etc.) hangs until timeout. Confirmed via
`getent hosts <host>` (IPv6-only) vs `getent ahostsv4 <host>` (real IPv4s exist) plus raw
`/dev/tcp` connect tests — IPv4 itself works fine.

Fix used (kept entirely inside `.env`, no system files touched): connect via the IPv4 address
directly and pass Neon's endpoint ID as a connection option, which is Neon's documented mechanism
for clients that can't rely on SNI-based routing (normally the hostname implies which backend to
route to via SNI; connecting by bare IP has no hostname/SNI to route on):

```
postgresql://<user>:<password>@<ipv4>:5432/<db>?sslmode=require&options=endpoint%3D<endpoint-id>
```

`<endpoint-id>` is the `ep-...` segment of the original hostname — include the `-pooler` suffix
for `DATABASE_URL` (pooled), omit it for `DIRECT_URL`. Both hostnames resolve to the same IPv4
proxy addresses; routing happens via this parameter, not the IP itself.

If this ever stops connecting, re-run `getent ahostsv4 <original-neon-hostname>` — Neon's proxy
IPs aren't guaranteed permanent — and update `.env` with the new address. See `.env.example` for
the full recipe.
