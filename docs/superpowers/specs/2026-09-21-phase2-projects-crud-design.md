# Phase 2: Projects CRUD — Design

Sub-project 2 of the personal task tracker build (see `prompt.md` for the full product spec and
the 13-phase build order, and `docs/superpowers/specs/2026-09-21-phase1-foundation-design.md` for
what Phase 1 already built: auth, app shell, Prisma schema, seed data). This phase replaces the
`/projects` placeholder with real Projects CRUD, scoped to the authenticated user. No task
management inside a project yet — that's Phase 4 (Tasks CRUD) and Phase 5 (Project Details).

## Goal

The logged-in user can see all their projects on `/projects`, create a new one via a `+ New
Project` sheet, edit an existing one, archive it, or delete it (with confirmation) — all from
that one page. Project cards show name, description, status, a computed progress bar, completed
vs. remaining task counts, and last-updated time, per the spec's Projects Page section.

## Decisions

- **Create/Edit UI**: a `Sheet` (already installed in Phase 1 for mobile nav) in create mode and
  edit mode, sharing one form component. The spec allows "a simple modal or sheet" — reusing
  `Sheet` avoids installing a second overlay primitive (`dialog`) for the same job.
- **Fields**: `name` (required, 1–100 chars), `description` (optional, textarea, shadcn
  `textarea` — new component), `color` (a fixed palette of 8 preset hex swatches, not a free-form
  picker — spec says "do not overcomplicate project creation"), `status` (shadcn `select` — new
  component; enum `ProjectStatus`, defaults to `ACTIVE` on create).
- **Archive vs. Delete**: Archive is a soft, reversible action — sets `status = ARCHIVED` and
  `archivedAt = now()`, no confirmation dialog (undoing it is just editing status back). Delete is
  a hard delete cascading to that project's tasks and activities (already `onDelete: Cascade` in
  the schema) and requires confirmation via shadcn `alert-dialog` (new component), per the spec's
  "confirmation dialogs for destructive actions."
- **No filtering yet**: `/projects` lists every one of the user's projects regardless of status,
  distinguished by a status badge (shadcn `badge` — new component). Search/filter is explicitly
  Phase 9 in the spec's own build order; adding it now would be scope creep for this phase.
- **Progress**: computed at read time as `completedTasks / totalTasks` per project (0% / "No
  tasks yet" when `totalTasks === 0`) — never stored, per the spec's explicit instruction. Since
  no UI creates tasks yet (Phase 4), real projects will show 0%/"No tasks yet" until then; the
  seeded demo data (Phase 1) already has tasks, so it will show real percentages.
- **Sort**: `updatedAt desc` — no explicit spec requirement, sensible default ("most recently
  touched first").
- **Activity logging**: out of scope for this phase. `prompt.md`'s spec lists "Project created" as
  a trackable activity type, but activity tracking is explicitly its own later phase (Phase 10);
  wiring individual activity-log writes into every action now would be scope creep ahead of that
  phase's own design (e.g. how activity feeds are displayed, retention, etc.).

## Scope

In scope:
- `actions/projects.ts` Server Actions: `listProjects`, `createProject`, `updateProject`,
  `archiveProject`, `deleteProject` — every query/mutation scoped to `session.user.id` (the actual
  authorization boundary, same pattern as Phase 1's `actions/auth.ts`)
- `lib/validations/project.ts`: Zod schema for create/edit (name, description, color, status)
- `/projects` page (Server Component): fetches the user's projects, computes progress per project,
  renders project cards in a responsive grid
- Project card component: name, description, status badge, progress bar, completed/remaining
  counts, last-updated (relative time, e.g. "Updated 2 hours ago"), and an actions menu
  (dropdown: Edit, Archive, Delete)
- Create/Edit sheet + form (Client Component), reused for both flows
- Delete confirmation alert dialog
- Empty state: "Create your first project to start organizing your work." + "Create Project"
  button, per the spec's empty-states section
- New shadcn components: `textarea`, `select`, `alert-dialog`, `badge` (via the same pinned
  `shadcn@3.8.5` CLI as Phase 1)

Out of scope (later phases): task management inside a project (Phase 4/5), search/filters (Phase
9), activity logging (Phase 10), the dashboard's "Recent Projects" widget (Phase 7) — though this
phase's `listProjects` action is written generally enough for Phase 7 to reuse.

## Verification

- `npm run build`, `npx tsc --noEmit`, `npm test` all pass
- Manual (real browser, logged in as the seeded demo user): create a project, confirm it appears
  immediately without a full page reload; edit it and confirm changes persist; archive it and
  confirm the status badge updates; delete a project and confirm the confirmation dialog blocks
  accidental deletion, then confirm it's gone; confirm a second user (register a fresh account)
  sees zero projects and cannot see the first user's projects by any route
