# Kanban Drag-to-Reorder Design

**Status:** Approved by user in conversation (sections 1-5 confirmed); this doc captures those
decisions plus the details needed to write an implementation plan.

## Background

CLAUDE.md previously locked in "`@dnd-kit/core` only, not `sortable` — no persisted manual
ordering" for the Kanban board. The user explicitly asked to reverse this: dragging a task card
over another card should animate and reposition it (above/below the hovered card), and that
manual position should persist. This doc supersedes that locked decision for the Kanban board
specifically; CLAUDE.md will be updated to reflect the new decision once this ships.

## Scope

- Manual drag-to-reorder applies **only to the Kanban board** (`/projects/[slug]`). `/today`,
  `/upcoming`, `/completed` keep their existing `orderBy` (priority / due date / completedAt) —
  untouched by this feature.
- Order is scoped **per (project, status)** — each project's Kanban board has its own independent
  ordering within each of its three columns (To Do / In Progress / Completed). This matches how
  the board is always viewed (one project at a time).
- Dragging a card into a **different column** (status change) drops it at the **exact position**
  under the pointer, not always at the end — matching a standard Trello-style board and the
  original request ("change position either on top or bottom depending where the dragged card is
  hovering").
- New tasks and tasks completed via checkbox (not drag) are appended to the end of their column
  (`max(order) + 1`) — no drop position exists in those flows.

## Data model

Add `order Int @default(0)` to `Task` in `prisma/schema.prisma`, indexed alongside the existing
`projectId`/`status` lookup pattern: `@@index([projectId, status, order])`.

**Backfill:** existing rows all default to `0`, which would make every task in a column tie on
order. The migration must backfill real values for existing rows so boards don't visually shuffle
on first load after deploy — assign order by row-number within each `(projectId, status)` group,
seeded from the current de facto sort (`priority desc, dueDate asc, createdAt asc`), so the
post-migration board looks the same as before until the user drags something. This is a data
backfill (`UPDATE ... window function`) appended to the generated migration SQL, applied in the
same transaction as the `ALTER TABLE`.

**Type flow:** `TaskListItemData` (currently `TaskInput & { id: string }` in
`src/components/tasks/task-list-item.tsx`) gains `order: number`. `order` is **not** added to
`taskSchema` in `src/lib/validations/task.ts` — it's drag-derived, never user-typed, so it must
never appear in the create/edit form's Zod validation or the `TaskFormSheet` UI.

## Persistence

One new Server Action, `reorderTasks`, replaces the Kanban board's current
call to `updateTaskStatus` on drop. It accepts the full ordered task-ID list for each column
affected by the drop (one column for a same-column reorder, two for a cross-column move), plus
which task changed status (if any). In a single Prisma transaction, scoped by `userId` (following
the existing `updateMany({ where: { id, userId } })` ownership pattern used throughout
`actions/tasks.ts`):

- Reindex `order` to `0..N-1` for every task in each affected column, in the new order given.
- If the dragged task's status changed, update its `status` and `completedAt` (set on entering
  COMPLETED, cleared on leaving it) — replicating `updateTaskStatus`'s existing logic — and log a
  `TASK_COMPLETED` activity entry under the same condition it does today.
- `revalidatePath` the same paths `updateTaskStatus` does today.

Kanban drag is the only caller of this new action. Checkbox-based status toggles elsewhere
(row variant, `updateTaskStatus`) are untouched and keep appending to the end of their target
column rather than computing a drop position.

## Client interaction (dnd-kit)

Switch from the current `useDraggable`-only setup (Phase 11) to `@dnd-kit/sortable`'s standard
multi-container pattern:

- Each `KanbanColumn` wraps its cards in a `SortableContext` (`verticalListSortingStrategy`).
- `KanbanCard` uses `useSortable` instead of `useDraggable`, so it participates in reordering
  animations (`transform`/`transition` from the hook) as siblings shift to make room.
- `onDragOver` live-moves the dragged task between columns' local arrays as the pointer crosses a
  column boundary, so the user sees immediate visual feedback (this mirrors dnd-kit's documented
  multi-container recipe).
- `onDragEnd` computes the final ordered ID list per affected column from local state and calls
  the new persistence action; optimistic update with rollback on failure, same pattern as the
  existing `updateTaskStatus` call site.
- `DragOverlay` (added in Phase 11) is kept as-is for the floating drag visual.

## Testing / verification

- Unit: any pure helper introduced for computing reindexed order arrays.
- Manual (Playwright, matching the Phase 11 verification style): drag within a column and confirm
  siblings animate to make room and the new order survives a page reload; drag across columns and
  confirm exact drop-position placement, status change, and activity log entry; confirm checkbox
  completion still appends to the end without needing a drop position; confirm `/today`,
  `/upcoming`, `/completed` ordering is unaffected.
