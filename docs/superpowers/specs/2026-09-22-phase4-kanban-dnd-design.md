# Phase 4: Project Details Kanban + Drag-and-Drop — Design

Sub-project 4 of the personal task tracker build. Builds directly on Phase 3's Tasks CRUD
(`/projects/[id]`, `actions/tasks.ts`, `TaskFormSheet`, `TaskListItem`) — this phase only changes
how tasks are *displayed and moved between statuses* on that page. No new data model, no new
Server Actions beyond what Phase 3 already built.

## Goal

The project detail page shows tasks grouped into three columns — To Do, In Progress, Completed —
and dragging a card to a different column moves it there instantly, with the change persisted in
the background. Everything Phase 3 built (quick add, edit sheet, delete, checkbox-complete-toggle)
keeps working unchanged.

## Decisions

- **Cross-column drag only, no persisted manual order.** The schema has no `order`/`position`
  field, and the spec only asks for column-based grouping ("Allow dragging tasks between
  sections"), not free within-column reordering — adding an order field now would be exactly the
  "overcomplicated drag-and-drop" the spec explicitly warns against. Dropping a task into a column
  calls Phase 3's existing `updateTaskStatus(taskId, status)` unchanged; within a column, tasks
  keep the same priority/due-date sort Phase 3 already established.
- **`@dnd-kit/core` directly, not `@dnd-kit/sortable`.** Sortable's whole purpose is persisted
  manual ordering, which this phase deliberately doesn't do — pulling it in would add weight for a
  feature we're not building. `DndContext` + `useDraggable` (per card) + `useDroppable` (per
  column) is the full surface area needed.
- **True optimistic move (per this session's direction):** a new Client Component,
  `KanbanBoard`, holds its own `tasks` state seeded from the Server Component's fetch. On drop, it
  updates that local state immediately (card visually snaps to the new column with no wait), then
  fires `updateTaskStatus` in the background. On failure, it reverts the local state and shows an
  error toast. Whenever the server-provided task list prop changes identity (i.e., any Server
  Action anywhere on the page — create/edit/delete/checkbox-toggle — triggers `revalidatePath` and
  the page re-renders), a `useEffect` re-syncs local state to match, so the optimistic copy never
  drifts from reality for long and self-corrects if the guess was wrong.
- **Keyboard/mobile fallback stays first-class, not an afterthought.** `TaskFormSheet`'s Status
  select (built in Phase 3) remains the fully-functional non-drag way to move a task between
  statuses — necessary since drag-and-drop isn't keyboard-accessible, and three side-by-side
  columns are cramped on narrow screens (columns stack vertically below a breakpoint; dragging
  still works stacked, just vertically instead of horizontally).
- **Component reuse over duplication:** rather than a new near-duplicate card component, Phase
  3's `TaskListItem` gains a `variant: "row" | "card"` prop (default `"row"`, so nothing about its
  current Phase 3 usage changes) — same checkbox/title/priority-badge/due-date-chip logic and same
  click-to-edit behavior, just a different outer layout for the two contexts. The Kanban board
  uses `variant="card"`.

## Scope

In scope:
- `npm install @dnd-kit/core`
- `src/components/tasks/task-list-item.tsx`: add the `variant` prop (Phase 3 file, modified not
  recreated)
- `src/components/tasks/kanban-column.tsx`: one droppable column — header (label + count),
  droppable area, renders its tasks as cards
- `src/components/tasks/kanban-board.tsx`: `DndContext` wrapper, optimistic state + resync effect,
  `onDragEnd` handler, renders the three `KanbanColumn`s
- `src/app/(dashboard)/projects/[id]/page.tsx`: modified to render `KanbanBoard` instead of a flat
  task list (the Server Component's data-fetching and header/progress-bar logic are unchanged —
  only the task-list-rendering portion is replaced)

Out of scope: any change to `actions/tasks.ts` (nothing new needed), any change to the seed data,
manual reordering within a column, activity logging for status changes (still Phase 10).

## Verification

- `npm run build`, `npx tsc --noEmit`, `npm test` all pass
- Manual (real browser, logged in as the seeded demo user): open Client Website, confirm its 4
  tasks appear in the correct columns (3 To Do/In Progress-eligible, 1 Completed — matching
  Phase 3's seed data and status field); drag a To Do task into In Progress, confirm it snaps
  there immediately and the change survives a page reload (i.e., it actually persisted, not just
  a local visual change); drag a task into Completed, confirm the header progress bar updates;
  create a new task via Quick Add while columns are showing, confirm it appears in the correct
  column without needing a manual refresh (exercises the resync effect); confirm the existing
  checkbox toggle and edit sheet still work unchanged from within a card; resize to a narrow
  viewport and confirm columns stack vertically and remain usable; check the browser console for
  errors throughout
