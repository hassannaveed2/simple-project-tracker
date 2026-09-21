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
- Tailwind CSS + shadcn/ui
- Prisma ORM **v5** (`prisma` and `@prisma/client` pinned to the 5.x line) — deliberately not v6
- Neon Postgres for both dev and prod (same connection string architecture, no local Postgres)
- Auth.js v5 (`next-auth@beta`) with `@auth/prisma-adapter`, Credentials provider (email/password
  first; Google OAuth is optional/deferred), **JWT session strategy** (required because Credentials
  provider is incompatible with database sessions), `bcryptjs` for password hashing (pure JS, no
  native build step — matters for Vercel's serverless functions)
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
