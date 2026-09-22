# Phase 9: Search & Filters — Design

## Goal

Add a global search command palette (Ctrl+K) covering Projects and Tasks, and add
Status/Priority/Due-date filters to the Project Detail page's task view — per `prompt.md`'s
"Search" and "Filters" sections and the Phase 9 build-order line ("Add search and filters").

Task Sorting (a separate spec section: sort by due date/priority/created/updated) is explicitly
deferred to a later polish phase and is **not** part of this phase.

## 1. Global Search (Ctrl+K command palette)

### Component: `src/components/search/search-palette.tsx` (Client Component)

- Built on shadcn's `Command`/`CommandDialog` primitives (`npx shadcn@3.8.5 add command`).
- Mounted once in the `(dashboard)` layout (`src/app/(dashboard)/layout.tsx`), alongside the
  existing sidebar.
- Opens via:
  - A global `keydown` listener for `Ctrl+K` (Windows/Linux) / `Cmd+K` (Mac), `preventDefault()`
    to stop the browser's own shortcuts.
  - A visible "Search" button/trigger in the sidebar (for discoverability and non-keyboard users).
- Closes on: selecting a result, pressing `Escape`, or clicking outside (handled by
  `CommandDialog`'s own `open`/`onOpenChange`).

### Data flow

- Local `query` state, debounced ~200ms (a small `useDebouncedValue` hook or inline
  `useEffect` + `setTimeout`) before triggering a fetch.
- Empty query → show nothing (no default/"recent searches" list).
- Non-empty debounced query calls a new Server Action:

```ts
// src/actions/search.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type SearchResult = {
  projects: { id: string; slug: string; name: string }[];
  tasks: { id: string; title: string; projectSlug: string; projectName: string }[];
};

export async function search(query: string): Promise<SearchResult> {
  const session = await auth();
  const userId = session!.user.id;
  const trimmed = query.trim();
  if (!trimmed) return { projects: [], tasks: [] };

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { userId, name: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, slug: true, name: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, title: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, title: true, project: { select: { slug: true, name: true } } },
      take: 5,
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    projects,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectSlug: t.project.slug,
      projectName: t.project.name,
    })),
  };
}
```

- Matching is **title/name-only**, case-insensitive `contains` — the same convention already
  used by `/completed`'s search box (`title: { contains: q, mode: "insensitive" }`). Task
  descriptions/notes and project descriptions are not searched (YAGNI, and it keeps ranking
  simple: no need to weight a description match differently from a title match).
- Completed tasks are included in results — no status filter. Search is meant to find anything by
  name, not just active work.
- Each entity capped at 5 results (no pagination — this is a personal tool with a handful of
  projects/tasks, not an enterprise search feature).

### Rendering

- Two `CommandGroup`s, "Projects" and "Tasks", each hidden entirely when empty.
- A task row shows its title with the parent project name as a secondary/muted line, matching the
  spec's example shape:
  ```
  Client Website
  → Fix homepage header
  ```
- Selecting a Project result navigates to `/projects/<slug>`.
- Selecting a Task result navigates to `/projects/<projectSlug>` (its parent project's page) — not
  a task-specific deep link. The task will be visible on the Kanban board there; auto-opening its
  edit sheet is out of scope (would require passing state across navigation for marginal benefit).
- Both selections close the palette immediately (`onOpenChange(false)` in the `onSelect` handler).

### Loading/empty states

- While the debounced Server Action call is in flight, show a small "Searching…" `CommandEmpty`
  state.
- If the call resolves with both arrays empty, show "No results found."

## 2. Project Detail Filters

### Component: `src/components/tasks/task-filters.tsx` (Client Component)

- Modeled directly on the existing `src/components/completed/completed-filters.tsx`: reads
  `useSearchParams`, and each `Select`'s `onValueChange` calls `router.push` with an updated
  query string immediately (no submit button needed — these are single-value dropdowns, unlike
  the free-text search input on `/completed`).
- Three filters, none of which include a "Project" option (redundant on a page already scoped to
  one project):
  - **Status** — `all | TODO | IN_PROGRESS | COMPLETED` (reuses the existing `TaskStatus` enum
    values and labels already used elsewhere, e.g. in `TaskFormSheet`).
  - **Priority** — `all | LOW | MEDIUM | HIGH` (reuses the existing `TaskPriority` enum).
  - **Due date** — `all | overdue | today | upcoming | none`, computed the same way the
    Today/Upcoming pages already bucket due dates (`overdue`: `dueDate < todayStart`; `today`:
    `todayStart <= dueDate < todayEnd`; `upcoming`: `dueDate >= todayEnd`; `none`: `dueDate is
    null`).
- Rendered above the Kanban board, below the project header/progress line, on
  `src/app/(dashboard)/projects/[slug]/page.tsx`.

### Data flow

- `ProjectDetailPage` becomes `searchParams: Promise<{ status?, priority?, due?: string }>` (the
  Next.js 15 async searchParams pattern, matching `/completed`'s existing page).
- The existing single `prisma.project.findFirst({ where: { slug, userId }, include: { tasks: {
  ... } } })` query gets its `tasks.where` extended conditionally:

```ts
const { status, priority, due } = await searchParams;

const now = new Date();
const todayStart = startOfUtcDay(now); // reuse existing helper pattern from today/page.tsx
const todayEnd = addDays(todayStart, 1);

let dueWhere: Prisma.TaskWhereInput | undefined;
if (due === "overdue") dueWhere = { dueDate: { lt: todayStart } };
if (due === "today") dueWhere = { dueDate: { gte: todayStart, lt: todayEnd } };
if (due === "upcoming") dueWhere = { dueDate: { gte: todayEnd } };
if (due === "none") dueWhere = { dueDate: null };

const project = await prisma.project.findFirst({
  where: { slug, userId },
  include: {
    tasks: {
      where: {
        ...(status ? { status: status as TaskStatus } : {}),
        ...(priority ? { priority: priority as TaskPriority } : {}),
        ...(dueWhere ?? {}),
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
    },
  },
});
```

- The filtered `project.tasks` list is passed into the existing `KanbanBoard` as `initialTasks`,
  exactly as today — **no changes needed inside `KanbanBoard` itself**. Its existing
  `useEffect(() => setTasks(initialTasks), [initialTasks])` re-sync already handles a new,
  smaller list arriving after a filter change or after a drag-and-drop status update revalidates
  the page.
- One consequence worth calling out explicitly (not a bug): if a Status filter is active (e.g.
  "To Do" only) and the user drags a task to a different column, the drag itself completes
  optimistically, but once the Server Action's `revalidatePath` refreshes server data, the task
  will disappear from the board (it no longer matches the Status filter). This mirrors the
  existing, already-accepted "uncheck to restore" disappearing behavior on `/completed`.
- The project's overall progress line (`X/Y tasks · Z%`) stays computed from **all** of the
  project's tasks, not the filtered subset — filters only affect which tasks are visible on the
  board, not the progress calculation. (Reinforces the existing rule that progress is always
  computed from the true completed/total ratio, never from a filtered view.)

### Testing

- No new pure-logic helpers are introduced that need unit tests — the due-date bucketing reuses
  the same UTC-midnight arithmetic pattern already covered by existing tests
  (`format-due-date.test.ts`, `group-tasks-by-due-date.test.ts`). Verification for this phase is
  manual browser testing (per the project's established "unit tests for logic only" approach) —
  confirm each filter combination against the seeded data, confirm search results for known
  project/task names, confirm the Ctrl+K shortcut and the visible trigger both open the palette,
  and confirm result navigation lands on the right project page.

## Files touched

- Create: `src/actions/search.ts`
- Create: `src/components/search/search-palette.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` (mount `SearchPalette`)
- Create: `src/components/tasks/task-filters.tsx`
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx` (searchParams + filtered query + render
  `TaskFilters`)
- shadcn: add `command` component (`npx shadcn@3.8.5 add command`)
