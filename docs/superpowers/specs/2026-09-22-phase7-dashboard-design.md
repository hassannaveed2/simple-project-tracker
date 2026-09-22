# Phase 7: Dashboard — Design

Sub-project 7 of the personal task tracker build (prompt.md's own numbering — Phases 1–6 covered
setup, Projects CRUD, Tasks CRUD, Project Details, and Kanban drag-and-drop, all complete). This
phase replaces the `/` placeholder with the real Dashboard: greeting, stat cards, today's tasks,
upcoming tasks, recent projects, and a small calendar widget.

## Goal

Logging in and landing on `/` immediately answers "what do I need to work on today" — a greeting,
four at-a-glance stats, today's tasks grouped by project (completable right there), a preview of
what's coming up, the user's most recently touched projects, and a calendar showing which days
have tasks due.

## Decisions

- **Greeting uses UTC hour, not the visitor's local time.** This app has no per-user timezone
  setting anywhere (Phase 3's `formatDueDate` already does all its day-boundary math in UTC for
  the same reason — consistency without adding a timezone concept nobody asked for). The greeting
  is cosmetic text with no functional consequence, so a mismatch for non-UTC users is an accepted,
  low-stakes trade-off rather than a reason to introduce timezone handling.
- **Stats are unfiltered by project status.** Total Projects / Active Tasks / Due Today / Completed
  This Week count across all the user's data regardless of whether a project is archived —
  consistent with `/projects` itself showing every project today. Status-aware filtering is
  explicitly Phase 9's job (search & filters), not this phase's.
- **"Completed This Week" = rolling 7 days, not calendar week.** Avoids locale/week-start
  ambiguity (does the week start Sunday or Monday?) for a stat nobody will audit precisely — "how
  much did I get done recently" is the actual question being answered.
- **Today's Tasks reuses `TaskListItem` (row variant) unchanged**, grouped by project — the
  checkbox-complete-directly and click-to-edit behavior Phase 3/4 already built is exactly what
  the spec asks for here ("allow completing tasks directly from the dashboard").
- **Upcoming Tasks is a lightweight, read-only preview**, not another interactive surface. The
  spec's field list for this section is just name/project/due date/priority, with no mention of
  inline completion or editing — reusing the heavier `TaskListItem` (which embeds a full edit
  sheet) would be scope creep for what's meant to be a glance-and-go list. A dedicated, simple
  presentational row is enough; the user can click into the actual project for anything more.
- **Recent Projects reuses `ProjectCard` directly**, showing the 3 most recently updated projects.
  The "raw Prisma project → `ProjectCardData`" mapping currently lives inline in `/projects/page.tsx`
  and is about to be needed a second time here — pulling it into one shared helper now avoids two
  copies drifting apart later.
- **Calendar widget stays intentionally simple**, per the spec's own "keep it simple" instruction:
  one query at page load fetches the user's tasks with due dates in a bounded window (30 days back,
  60 days forward — enough to be useful without being unbounded), marks which calendar days have a
  task, and clicking a day filters that already-fetched list client-side. No new Server Action, no
  per-click round-trip, no month-by-month lazy loading.

## Scope

In scope:
- `src/lib/greeting.ts` (+ test): pure `getGreeting(hour: number): string` → "Good
  morning"/"afternoon"/"evening"
- `src/lib/project-card-data.ts` (+ test): pure `toProjectCardData(...)` mapping helper, extracted
  from `/projects/page.tsx`'s existing inline logic and reused by both it and the dashboard
- `src/components/dashboard/stat-card.tsx`: small presentational label+value card
- `src/components/dashboard/today-tasks-section.tsx`: groups today's (non-completed) tasks by
  project, renders `TaskListItem` rows
- `src/components/dashboard/upcoming-task-row.tsx`: the lightweight read-only row described above
- `src/components/dashboard/dashboard-calendar.tsx`: the calendar widget (Client Component)
- New shadcn component: `calendar` (via the pinned `shadcn@3.8.5` CLI)
- `src/app/(dashboard)/page.tsx`: rewritten to fetch everything above and assemble the page

Out of scope: any change to `/projects` or `/projects/[slug]` beyond extracting the shared mapping
helper (Recent Projects doesn't need a new query shape — it's the same project+task-status shape
`/projects/page.tsx` already fetches, just `take: 3`); status-aware stat filtering (Phase 9);
activity-log entries for anything shown here (Phase 10).

## Verification

- `npm run build`, `npx tsc --noEmit`, `npm test` all pass
- Manual (real browser, logged in as the seeded demo user): `/` shows a time-appropriate greeting
  with the user's name, correct stat counts matching the seed data, today's overdue/due-today task
  (from the seed) appearing under Today's Tasks with a working checkbox, both seed projects
  appearing under Recent Projects as real `ProjectCard`s linking to their slugs, the calendar
  showing a marker on the date that has a due task, and clicking that date filtering the list to
  just that day's task; completing a task from the dashboard updates the stat cards without a full
  reload; a brand-new user with zero projects sees sensible empty states, not a broken layout
