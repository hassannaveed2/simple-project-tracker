# Phase 1: Foundation — Design

Sub-project 1 of the personal task tracker build (see `prompt.md` for the full product spec and
the 13-phase build order this decomposition follows). This phase produces a scaffolded,
authenticated, styled app shell with a real database schema — no Projects/Tasks CRUD yet. Every
later phase builds on top of what this phase produces.

## Goal

Someone can register, log in, and land on an app shell (sidebar nav + placeholder pages for
Dashboard/Projects/Today/Upcoming/Completed/Settings, dark/light/system theme working, mobile
responsive) backed by a real Postgres database with the full schema migrated in, and a seed
script populates demo data. No task or project management functionality exists yet — that's
Phases 2+.

## Decisions

- **Package manager**: npm.
- **Prisma**: pinned to the 5.x line (`prisma@5`, `@prisma/client@5`) rather than 6, per explicit
  request — avoids Prisma 6's engine/ESM changes for now.
- **Database**: Neon Postgres, used directly for both local dev and production (no local Postgres
  install/Docker). The user will create the Neon project and paste `DATABASE_URL`/`DIRECT_URL`
  into `.env` when the scaffold reaches that point — this phase's setup instructions must call
  out that pause point explicitly.
- **Auth**: Auth.js v5 (`next-auth@beta`), Credentials provider (email/password) only for now —
  Google OAuth is deferred (spec marks it optional). Credentials provider forces **JWT session
  strategy** (Auth.js does not support database sessions with Credentials). `@auth/prisma-adapter`
  is deliberately *not* added in this phase — it has no effect on the Credentials flow (Auth.js
  never calls adapter methods for Credentials sign-in) and only earns its place once Google OAuth
  needs account linking; registration and login talk to Prisma directly. Passwords hashed with
  `bcryptjs` (pure JS — no native binary, avoids Vercel serverless build issues that native
  `bcrypt`/`argon2` can hit).
- **Route protection**: Next.js middleware checks the session and redirects unauthenticated
  requests to `/auth/login`. Every Server Action added in later phases must additionally scope
  its own Prisma queries by `session.user.id` — middleware alone does not enforce data isolation
  at the query level.
- **Styling/theme**: Tailwind + shadcn/ui (default style), `next-themes` for light/dark/system,
  preference persisted (via the theme cookie/localStorage next-themes already handles).

## Scope

In scope:
- `create-next-app` (Next.js 15.x, TypeScript, Tailwind, App Router, `src/` dir, ESLint)
- shadcn/ui init
- `prisma/schema.prisma` with `User`, `Project`, `Task`, `Activity` models, enums for
  `ProjectStatus` (Active/OnHold/Completed/Archived), `TaskStatus` (Todo/InProgress/Completed),
  `TaskPriority` (Low/Medium/High/Urgent), and the indexes listed in `prompt.md`
  (`Task.userId`, `Task.projectId`, `Task.status`, `Task.priority`, `Task.dueDate`,
  `Project.userId`)
- Initial migration via `prisma migrate dev`
- `.env.example` with `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, and commented-out
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
- Auth.js v5 config (`lib/auth.ts`), `/auth/login` and `/auth/register` pages with React Hook Form
  + Zod validation, middleware-based route protection
- App shell: sidebar (Dashboard, Projects, Today, Upcoming, Completed, Settings) with mobile
  responsive collapsing nav; all nav targets are placeholder pages (e.g. "Nothing here yet")
  except auth pages
- `prisma/seed.ts`: one demo user (credentials known/documented), 2–3 demo projects, a handful of
  demo tasks across them
- Folder structure exactly as documented in `CLAUDE.md`

Out of scope (later phases): any Projects/Tasks CRUD, dashboard stats/widgets, drag-and-drop,
search, filters, activity feed rendering, data export, calendar widget. Those pages exist only as
empty placeholders in this phase so the nav shell is fully wired.

## Verification

- `npm run build` succeeds
- `npx prisma migrate dev` applies cleanly against the Neon connection, `npx prisma db seed` runs
  without error
- Manual check: register a new user, log out, log in, confirm middleware redirects an
  unauthenticated request from e.g. `/today` to `/auth/login`, confirm theme toggle persists
  across reload, confirm sidebar collapses to mobile nav at narrow viewport
