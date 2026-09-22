# Phase 8: Today, Upcoming, Completed Pages — Design

Sub-project 8 of the personal task tracker build. Replaces the three remaining placeholder pages
(`/today`, `/upcoming`, `/completed`) with real content, reusing Phase 3/4's `TaskListItem` and
Phase 7's grouping pattern throughout rather than inventing new task-rendering code per page.

## Goal

- `/today`: three sections — Overdue, Due Today, No Due Date — each grouped by project, matching
  the spec's literal section list.
- `/upcoming`: tasks grouped by due date ("Tomorrow", "September 24", …) rather than by project,
  matching the spec's own example.
- `/completed`: completed tasks with search (title), project filter, and completion-period filter;
  un-completing (the existing checkbox) doubles as "restore a completed task" — no new action
  needed.

## Decisions

- **Generalize Phase 7's `TodayTasksSection` into a reusable `TaskGroupList`.** It's about to be
  used four times (Dashboard's Today's Tasks, plus `/today`'s three sections) with different empty
  messages — hardcoding "You don't have any tasks due today." into a component now also rendering
  "Overdue" groups would be wrong. Moving it from `components/dashboard/` to `components/tasks/`
  and adding an `emptyMessage` prop covers all four call sites with one component.
- **Extract the project-grouping logic into a pure, tested `groupTasksByProject` helper**, and
  have the Dashboard adopt it too (replacing its Phase-7 bespoke `Map`-building code). Now that
  the same grouping is needed in two places, duplicating it a third and fourth time on `/today`
  would be the wrong call.
- **`/upcoming` groups by `formatDueDate`'s own label**, via a new `groupTasksByDueDate` helper.
  Since this page only ever shows tasks due strictly after today, `formatDueDate` can only return
  "Tomorrow" or a short date ("Sep 24") for them — exactly the headers the spec's example shows —
  so no new date-formatting logic is needed, just grouping by that existing label.
- **`/upcoming` shows a 30-day window**, not literally every future task — an unbounded query
  would eventually return the entire task backlog. The Dashboard's own "Upcoming Tasks" preview
  (Phase 7) uses a tighter 7-day window for its at-a-glance list; this full page can reasonably
  show further out.
- **`/upcoming` rows don't show project name**, matching the spec's own example exactly (task
  titles under a date heading, no project mentioned). `/today`'s sections do group by project,
  because that's what the spec explicitly asks for there.
- **Completed page filters are simple GET-driven, not a client-state-heavy filter panel.** Project
  and period are `<Select>`s that navigate on change (`router.push` with updated query params);
  search is a plain text input + button (submit-to-apply, no debounced live search) — matches the
  spec's own "keep the filtering UI simple" instruction and keeps the page reading its state from
  `searchParams` like any other Server Component page, no separate client state to keep in sync.
- **Completion period is a coarse dropdown** (All time / This week / This month), not a date-range
  picker — the spec asks for "filter by completion date," not a specific UI for it, and a full
  range picker would be disproportionate for a personal app's completed-tasks review.
- **Restoring a completed task is just the existing checkbox.** `TaskListItem`'s checkbox already
  calls `updateTaskStatus` toggling between `TODO`/`COMPLETED`; on a page showing only completed
  tasks, unchecking one *is* restoring it. No new Server Action, no new UI element.

## Scope

In scope:
- `src/lib/group-tasks-by-project.ts` (+ test)
- `src/lib/group-tasks-by-due-date.ts` (+ test)
- `src/components/tasks/task-group-list.tsx` (moved/generalized from
  `components/dashboard/today-tasks-section.tsx`, deleted)
- `src/app/(dashboard)/page.tsx`: adopt `TaskGroupList` + `groupTasksByProject` (behavior
  unchanged, same rendering as Phase 7 shipped — this is a refactor, not a feature change)
- `src/app/(dashboard)/today/page.tsx`, `.../upcoming/page.tsx`, `.../completed/page.tsx`: real
  content
- `src/components/completed/completed-filters.tsx`: the search/project/period filter bar

Out of scope: the global `Ctrl+K` search modal spanning projects and tasks (Phase 9 — this
phase's Completed-page search is scoped to that one page's own list, a different, simpler thing);
activity logging (Phase 10).

## Verification

- `npm run build`, `npx tsc --noEmit`, `npm test` all pass
- Manual (real browser, logged in as the seeded demo user): `/today` shows the seeded overdue/
  due-today task(s) grouped correctly (and "No tasks without a due date." if none lack one);
  `/upcoming` shows any task due in the next 30 days grouped under the right date headings;
  `/completed` shows "Deploy to staging", searching for a non-matching term empties the list,
  filtering by project narrows it correctly, unchecking a completed task's checkbox moves it back
  to an active state (confirmed by revisiting `/today` or the project page); the Dashboard's
  Today's Tasks section still renders identically to before this phase's refactor
