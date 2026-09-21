# Phase 3: Tasks CRUD — Design

Sub-project 3 of the personal task tracker build (see `prompt.md` for the full product spec, and
the Phase 1/2 design docs for the foundation and Projects CRUD this phase builds on). `prompt.md`'s
own build order splits "Tasks CRUD" and "Project Details with task management" (Kanban +
drag-and-drop) into separate phases — this phase is the former. No Kanban columns or dnd-kit yet;
that's Phase 5.

## Goal

From a project's detail page, the user can see all of that project's tasks, quickly add a new one
(title is the only required field), open any task to view/edit its full details (description,
notes, priority, due date, status), mark it complete with one click, or delete it — all scoped to
the authenticated user and updating without a full page reload.

## Decisions

- **New route**: `/projects/[id]` (doesn't exist yet). Server Component: fetches the project
  (`notFound()` if it doesn't exist or isn't owned by the current user — same ownership-at-the-
  query pattern as Phase 2), its tasks, and the user's full project list (for the task form's
  project selector). Header shows name, description, progress bar (reusing Phase 2's
  `computeProjectProgress`), and an Edit button reusing Phase 2's `ProjectFormSheet` directly — no
  new project-editing code needed here.
- **One shared `TaskFormSheet`** for create and edit, mirroring Phase 2's `ProjectFormSheet`
  pattern exactly, rather than a separate "quick add" form and a separate "full edit" form. The
  spec's "title is the only required field" is satisfied because every other field either has a
  sensible default (`status` defaults to `TODO`, `priority` to `MEDIUM`, `projectId` defaults to
  the project the sheet was opened from) or is genuinely optional (`description`, `notes`,
  `dueDate`). One sheet, less duplication, still satisfies "make adding tasks extremely fast."
- **Due date input**: a plain HTML `<input type="date">` (via the existing shadcn `Input`), not a
  calendar-picker component. Keeps this phase's scope to CRUD; a nicer picker is a polish-phase
  concern, not a functional gap.
- **One-click complete toggle**: a checkbox directly on each task row flips between `TODO` and
  `COMPLETED` immediately (no sheet needed) — this is the same affordance the spec asks for on the
  Dashboard and Today pages later, so building it as a reusable action now (`updateTaskStatus`)
  means those later phases just call the same action instead of inventing their own.
- **Due date labeling**: a new `formatDueDate` utility (pure function, TDD) renders "Today" /
  "Tomorrow" / "Sep 25" / "Overdue", per the spec's Due Dates section. This is written now because
  this page's task rows need it immediately, not speculatively — the same function will be reused
  by Today/Upcoming (Phase 8) without changes.
- **Notes**: a plain multiline `Textarea` field inside the same sheet — spec explicitly says no
  rich-text editor is needed.
- **Data layer**: `actions/tasks.ts` — `createTask`, `updateTask`, `updateTaskStatus`,
  `deleteTask`. Every mutation scoped by `{ id, userId }` in the `where` clause, identical
  authorization pattern to `actions/projects.ts`. `updateTaskStatus` sets `completedAt = now()`
  when moving to `COMPLETED` and clears it (`null`) otherwise, so a future "restore from Completed
  page" feature (Phase 8) can call the same action to un-complete a task without new logic.
- **Activity logging**: still out of scope, same reasoning as Phase 2 — it's explicitly its own
  later phase (Phase 10).

## Scope

In scope:
- `src/lib/validations/task.ts`: Zod schema (title required 1–200 chars; description/notes
  optional, ≤2000 chars; `projectId` required non-empty string; `priority` enum
  `LOW`/`MEDIUM`/`HIGH`/`URGENT` defaulting to `MEDIUM`; `dueDate` optional ISO date string or
  empty)
- `src/lib/format-due-date.ts` (+ test): pure function mapping a nullable due date to a label
  (`"Today"`, `"Tomorrow"`, a short date, or `"Overdue"`) and a variant
  (`"overdue" | "today" | "upcoming" | "none"`) for styling
- `src/actions/tasks.ts`: the four Server Actions described above
- `src/components/tasks/task-form-sheet.tsx`: shared create/edit sheet
- `src/components/tasks/delete-task-dialog.tsx`: delete confirmation (mirrors
  `DeleteProjectDialog`)
- `src/components/tasks/task-list-item.tsx`: one row — complete checkbox, title (struck through
  when completed), priority badge, due-date chip (only rendered when a due date exists), click
  opens `TaskFormSheet` in edit mode
- `src/app/(dashboard)/projects/[id]/page.tsx`: the new project detail page described above,
  including the empty state ("No tasks yet." + "Add Task" button, per the spec's empty-states
  section)

Out of scope (later phases): Kanban columns and drag-and-drop reordering (Phase 5), Dashboard/
Today/Upcoming pages actually surfacing these tasks (Phase 7/8 — though they'll reuse this phase's
actions and `formatDueDate` unchanged), search/filters (Phase 9), activity logging (Phase 10).

## Verification

- `npm run build`, `npx tsc --noEmit`, `npm test` all pass
- Manual (real browser, logged in as the seeded demo user): open the Client Website project,
  confirm its 4 seeded tasks render with correct status/priority; quick-add a task with only a
  title filled in, confirm it appears immediately; open a task, edit its fields including notes,
  save, confirm changes persist; toggle a task's complete checkbox, confirm the project's progress
  bar (visible via the header, same computation as the `/projects` grid) updates without a full
  reload; delete a task with confirmation; confirm a due-today task shows "Today" and an overdue
  one shows "Overdue"; confirm a second user cannot reach the first user's project detail page by
  guessing its URL (expect a 404, not the data)
