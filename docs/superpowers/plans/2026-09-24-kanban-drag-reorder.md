# Kanban Drag-to-Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persisted, per-(project, status) manual task ordering on the Kanban board, with
Trello-style drag animation: dragging a card over another live-repositions it (above/below the
hovered card), including across columns (which also changes status), and the final position
persists.

**Architecture:** Add a `Task.order` column, backfilled from the board's current de facto sort so
existing boards look unchanged until a user drags something. Switch the Kanban board from
`@dnd-kit/core`'s plain draggable/droppable to `@dnd-kit/sortable`'s standard multi-container
pattern (`SortableContext` per column, `useSortable` per card), with `onDragOver` doing live
`arrayMove` repositioning (both within and across columns) for the animation, and `onDragEnd`
persisting the converged local order via one new Server Action, `reorderTasks`, that reindexes
each affected column's tasks to `0..N-1` in a single transaction.

**Tech Stack:** New dependencies `@dnd-kit/sortable@^10.0.0` and `@dnd-kit/utilities@^3.2.2`
(peer-compatible with the installed `@dnd-kit/core@^6.3.1` — confirmed via `npm view` before
writing this plan). No other new dependencies.

**Design doc:** `docs/superpowers/specs/2026-09-24-kanban-drag-reorder-design.md`

**Note beyond the design doc:** the design doc doesn't address the Kanban board's existing status/
priority/due-date filters (`TaskFilters` component, `src/app/(dashboard)/projects/[slug]/page.tsx`
lines 46-53). Dragging while a filter is active would reindex only the filtered-visible subset of
a column sent to the server, leaving filtered-out siblings' `order` values untouched — which can
produce duplicate `order` values across visible and hidden tasks in the same column. This doesn't
crash or lose data (ordering always has a stable secondary tiebreak — see Task 2), it just means a
filtered drag's effect on ordering relative to hidden siblings is undefined until the user drags
again with the filter cleared. Given the personal-scale nature of this app, this plan accepts that
as a documented limitation (see the comment added in Task 4) rather than adding filter-aware
disabling — not in the approved spec, and not worth the added complexity for an edge case with no
data-loss or crash consequence.

---

### Task 1: Install `@dnd-kit/sortable` and `@dnd-kit/utilities`

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)

- [ ] **Step 1: Install**

```bash
npm install @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2
```

- [ ] **Step 2: Verify**

```bash
npm ls @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: all three listed with no `UNMET PEER DEPENDENCY` warnings (`@dnd-kit/sortable`'s peer
`@dnd-kit/core: ^6.3.0` is satisfied by the installed `^6.3.1`).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @dnd-kit/sortable and @dnd-kit/utilities for Kanban drag-to-reorder"
```

---

### Task 2: Schema migration — `Task.order`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_task_order/migration.sql`

- [ ] **Step 1: Add the field and index to the schema**

In `prisma/schema.prisma`, in `model Task`, add `order` after `completedAt` and a new composite
index alongside the existing ones:

```prisma
model Task {
  id          String       @id @default(cuid())
  projectId   String
  userId      String
  title       String
  description String?
  notes       String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  completedAt DateTime?
  order       Int          @default(0)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  activities Activity[]

  @@index([userId])
  @@index([projectId])
  @@index([status])
  @@index([priority])
  @@index([dueDate])
  @@index([projectId, status, order])
}
```

- [ ] **Step 2: Generate the migration SQL without applying it**

Per CLAUDE.md's non-interactive migration workflow:

```bash
npx prisma migrate dev --name add_task_order --create-only
```

This creates `prisma/migrations/<timestamp>_add_task_order/migration.sql` containing an
auto-generated `ALTER TABLE "Task" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;` plus a
`CREATE INDEX` for the new composite index, without applying it yet.

- [ ] **Step 3: Hand-edit the migration to backfill existing rows**

Postgres applies the column's constant default (`0`) to every existing row when the column is
added — every task in every column would tie at `order = 0`. Open the generated
`migration.sql` and append a backfill that assigns real values per `(projectId, status)` group,
seeded from the board's current de facto sort (matching the `orderBy` being replaced in Task 3):

```sql
-- Backfill order using the pre-existing de facto sort (priority desc, dueDate asc, createdAt
-- asc), per (projectId, status) column, so existing boards look unchanged until a user drags
-- something.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "projectId", "status"
           ORDER BY "priority" DESC, "dueDate" ASC NULLS LAST, "createdAt" ASC
         ) - 1 AS rn
  FROM "Task"
)
UPDATE "Task"
SET "order" = ranked.rn
FROM ranked
WHERE "Task".id = ranked.id;
```

(Postgres's `TaskPriority` enum was declared `LOW, MEDIUM, HIGH, URGENT` in the initial migration,
so `ORDER BY "priority" DESC` sorts `URGENT, HIGH, MEDIUM, LOW` — the same semantics as the
existing Prisma `orderBy: { priority: "desc" }`.)

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate deploy
```

Expected: reports the new migration applied successfully. `deploy` never prompts, so this works
regardless of whether the added column would have triggered `migrate dev`'s interactive
confirmation.

- [ ] **Step 5: Verify**

```bash
npx prisma studio
```

Spot-check a project with multiple tasks in the same column — confirm `order` values are `0, 1,
2, ...` per column rather than all `0`. Close Prisma Studio when done.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add Task.order for persisted Kanban manual ordering"
```

---

### Task 3: Thread `order` through `TaskListItemData` and every task-fetching page

**Files:**
- Modify: `src/components/tasks/task-list-item.tsx`
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx`
- Modify: `src/app/(dashboard)/completed/page.tsx`
- Modify: `src/app/(dashboard)/upcoming/page.tsx`
- Modify: `src/app/(dashboard)/today/page.tsx`
- Modify: `src/lib/group-tasks-by-project.test.ts`
- Modify: `src/lib/group-tasks-by-due-date.test.ts`

`order` is drag-derived, never user-typed — it is **not** added to `taskSchema`/`TaskInput` in
`src/lib/validations/task.ts` (unchanged), so it never appears in the create/edit form. Verified
before writing this plan: `TaskFormSheet`'s `task` prop (`src/components/tasks/task-form-sheet.tsx`
line 60) has its own independent type, `{ id: string } & TaskInput` — not `TaskListItemData` — so
passing a `TaskListItemData` (with the new `order` field) into it is a normal structural-typing
assignment with an extra property, and the extra property is invisible inside that component. No
changes needed there.

- [ ] **Step 1: Add `order` to `TaskListItemData`**

In `src/components/tasks/task-list-item.tsx` line 15, change:

```ts
export type TaskListItemData = TaskInput & { id: string };
```

to:

```ts
export type TaskListItemData = TaskInput & { id: string; order: number };
```

- [ ] **Step 2: Verify it fails to compile (confirms every construction site needs updating)**

```bash
npx tsc --noEmit
```

Expected: multiple errors like `Property 'order' is missing in type '...' but required in type
'TaskListItemData'` across the files listed below.

- [ ] **Step 3: Update the Kanban board's data fetch and ordering**

In `src/app/(dashboard)/projects/[slug]/page.tsx`:

Change the `orderBy` at line 54 from:
```ts
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
```
to:
```ts
        orderBy: [{ status: "asc" }, { order: "asc" }],
```

Add `order: task.order,` to the `taskItems` mapping (lines 86-95), right after `status:
task.status,`:
```ts
  const taskItems: TaskListItemData[] = project.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    order: task.order,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  }));
```

- [ ] **Step 4: Update `/completed`, `/upcoming`, `/today` mappings**

These pages don't use `order` for sorting (per the design doc's scope — Kanban-only), but the
field is required on `TaskListItemData`, and every task row already has a real `order` value in
the database, so just select and pass it through unchanged:

In `src/app/(dashboard)/completed/page.tsx`, add `order: task.order,` to the `taskItems` mapping
(lines 40-49), after `status: task.status,`.

In `src/app/(dashboard)/upcoming/page.tsx`, add `order: task.order,` to the `taskItems` mapping
(lines 37-46), after `status: task.status,`.

In `src/app/(dashboard)/today/page.tsx`, add `order: task.order,` to the `toTaskItems` mapping
(lines 48-59), after `status: task.status,`.

None of these three files' Prisma queries need an explicit `select`/`orderBy` change — they use
plain `findMany` without a narrowing `select`, so `order` is already present on the returned
`task` object.

- [ ] **Step 5: Update the two test mock builders**

In `src/lib/group-tasks-by-project.test.ts`, add `order: 0,` to `makeTask`'s default object
(lines 11-19), alongside the existing `dueDate: ""`.

In `src/lib/group-tasks-by-due-date.test.ts`, add `order: 0,` to `makeTask`'s default object
(lines 6-15), alongside the existing `dueDate: ""`.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
npm test -- --run
```

Expected: no errors, all existing tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/task-list-item.tsx \
  "src/app/(dashboard)/projects/[slug]/page.tsx" \
  "src/app/(dashboard)/completed/page.tsx" \
  "src/app/(dashboard)/upcoming/page.tsx" \
  "src/app/(dashboard)/today/page.tsx" \
  src/lib/group-tasks-by-project.test.ts \
  src/lib/group-tasks-by-due-date.test.ts
git commit -m "Thread Task.order through TaskListItemData and every task-fetching page"
```

---

### Task 4: `reorderTasks` Server Action

**Files:**
- Modify: `src/actions/tasks.ts`

- [ ] **Step 1: Implement**

In `src/actions/tasks.ts`, add this new exported function after `updateTaskStatus` (after line
170, before `deleteTask`):

```ts
export type ReorderColumnInput = {
  status: TaskStatus;
  taskIds: string[];
};

// Note: this reindexes exactly the task IDs it's given, per column, to 0..N-1. If the Kanban
// board's filters are active when a drag happens, the given list is only the filtered-visible
// subset of a column — filtered-out siblings keep whatever order they already had, which can
// leave duplicate order values in that column until the user drags again with filters cleared.
// Harmless (ordering always falls back to a stable id tiebreak — see the orderBy this replaces),
// just a known, accepted limitation at this app's personal scale.
export async function reorderTasks(columns: ReorderColumnInput[]): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const allTaskIds = columns.flatMap((column) => column.taskIds);
  if (allTaskIds.length === 0) {
    return { success: false, error: "No tasks to reorder" };
  }

  const existingTasks = await prisma.task.findMany({
    where: { id: { in: allTaskIds }, userId },
    select: {
      id: true,
      status: true,
      title: true,
      projectId: true,
      project: { select: { name: true, slug: true } },
    },
  });
  if (existingTasks.length !== allTaskIds.length) {
    return { success: false, error: "Task not found" };
  }
  const taskById = new Map(existingTasks.map((task) => [task.id, task]));
  const projectSlug = existingTasks[0]!.project.slug;

  const completions: { taskId: string; projectId: string; title: string; projectName: string }[] =
    [];
  for (const column of columns) {
    for (const taskId of column.taskIds) {
      const task = taskById.get(taskId)!;
      if (column.status === "COMPLETED" && task.status !== "COMPLETED") {
        completions.push({
          taskId,
          projectId: task.projectId,
          title: task.title,
          projectName: task.project.name,
        });
      }
    }
  }

  await prisma.$transaction(
    columns.flatMap((column) =>
      column.taskIds.map((taskId, index) => {
        const task = taskById.get(taskId)!;
        return prisma.task.updateMany({
          where: { id: taskId, userId },
          data: {
            order: index,
            ...(task.status !== column.status
              ? {
                  status: column.status,
                  completedAt: column.status === "COMPLETED" ? new Date() : null,
                }
              : {}),
          },
        });
      })
    )
  );

  for (const completion of completions) {
    await logActivity({
      userId,
      projectId: completion.projectId,
      taskId: completion.taskId,
      type: "TASK_COMPLETED",
      metadata: { title: completion.title, projectName: completion.projectName },
    });
  }

  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath("/projects");
  return { success: true };
}
```

This follows the same `updateMany({ where: { id, userId } })` ownership-scoping pattern as every
other action in this file, and replicates `updateTaskStatus`'s `completedAt`/activity-logging
behavior exactly (only logs `TASK_COMPLETED` when a task's status changes *into* `COMPLETED`, and
only touches `completedAt` when status is actually changing).

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/tasks.ts
git commit -m "Add reorderTasks Server Action for persisted Kanban ordering"
```

---

### Task 5: Rewire the Kanban board to `@dnd-kit/sortable`

**Files:**
- Modify: `src/components/tasks/kanban-card.tsx`
- Modify: `src/components/tasks/kanban-column.tsx`
- Modify: `src/components/tasks/kanban-board.tsx`

- [ ] **Step 1: `kanban-card.tsx` — `useSortable` instead of `useDraggable`**

Replace the full contents of `src/components/tasks/kanban-card.tsx`:

```tsx
"use client";

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

export function KanbanCard({
  task,
  projects,
  projectColor,
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : undefined}
    >
      <TaskListItem task={task} projects={projects} variant="card" projectColor={projectColor} />
    </div>
  );
}
```

(`transform`/`transition` from `useSortable` — via the `CSS.Transform.toString` helper — are what
produce the "siblings slide to make room" animation as `SortableContext`'s item order changes;
`DragOverlay`, added in Phase 11, still renders the floating drag visual, so the source card just
dims to `opacity-50` in place, same as before.)

- [ ] **Step 2: `kanban-column.tsx` — wrap cards in `SortableContext`**

In `src/components/tasks/kanban-column.tsx`, add the import and wrap the cards' container:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { TaskListItemData } from "./task-list-item";
import type { TASK_STATUSES } from "@/lib/validations/task";

const COLUMN_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export function KanbanColumn({
  status,
  tasks,
  projects,
  projectColor,
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: TaskListItemData[];
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-32 min-w-0 flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-3",
        isOver && "bg-muted"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{COLUMN_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} projects={projects} projectColor={projectColor} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

(The column itself keeps its own `useDroppable` — needed as a drop target for an empty column, or
for dropping into the empty space below the last card. `SortableContext`'s `items` list is exactly
this column's current task IDs in order, so `verticalListSortingStrategy` knows how to animate
them.)

- [ ] **Step 3: `kanban-board.tsx` — live reposition on hover, persist on drop**

Replace the full contents of `src/components/tasks/kanban-board.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { reorderTasks } from "@/actions/tasks";
import { TASK_STATUSES } from "@/lib/validations/task";
import { KanbanColumn } from "./kanban-column";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

type TaskStatusValue = (typeof TASK_STATUSES)[number];

export function KanbanBoard({
  initialTasks,
  projects,
  projectColor,
}: {
  initialTasks: TaskListItemData[];
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskListItemData | null>(null);
  // Snapshot of `tasks` at the start of the current drag gesture — used to revert onDragOver's
  // live reordering if the drag is cancelled or dropped outside any valid target.
  const dragStartTasksRef = useRef<TaskListItemData[]>(initialTasks);

  // Re-sync whenever the server-provided list changes — e.g. any create/edit/delete/checkbox
  // action elsewhere on the page triggers revalidatePath and this page re-renders with fresh
  // data. This also corrects the optimistic move below if its guess at column order was off.
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    dragStartTasksRef.current = tasks;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  // Fires continuously as the pointer moves over a different card or column. Live-repositions
  // the active task in local state — via `arrayMove`, same as a plain single-list sortable — so
  // siblings visibly slide out of the way, both within a column and across columns (which also
  // flips the active task's status to match).
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setTasks((current) => {
      const activeIndex = current.findIndex((t) => t.id === activeId);
      if (activeIndex === -1) return current;

      const overTask = current.find((t) => t.id === overId);
      const overStatus = overTask ? overTask.status : (overId as TaskStatusValue);
      const activeStatus = current[activeIndex].status;

      const next =
        activeStatus === overStatus
          ? current
          : current.map((t, i) => (i === activeIndex ? { ...t, status: overStatus } : t));

      const overIndex = overTask ? next.findIndex((t) => t.id === overId) : next.length - 1;
      if (overIndex === -1) return next;

      return arrayMove(next, activeIndex, overIndex);
    });
  }

  // By drop time, `tasks` already reflects the fully-converged final arrangement from onDragOver
  // — this just persists it. If dropped outside any valid target, `over` is null and the whole
  // gesture reverts to how it looked before the drag started.
  function handleDragEnd(event: DragEndEvent) {
    const dragged = activeTask;
    setActiveTask(null);

    if (!event.over || !dragged) {
      setTasks(dragStartTasksRef.current);
      return;
    }

    const activeId = event.active.id as string;
    const finalStatus = tasks.find((t) => t.id === activeId)?.status ?? dragged.status;
    const affectedStatuses = new Set<TaskStatusValue>([dragged.status, finalStatus]);
    const columns = Array.from(affectedStatuses).map((status) => ({
      status,
      taskIds: tasks.filter((t) => t.status === status).map((t) => t.id),
    }));

    const previousTasks = dragStartTasksRef.current;
    reorderTasks(columns).then((result) => {
      if (!result.success) {
        setTasks(previousTasks);
        toast.error(result.error);
      }
    });
  }

  function handleDragCancel() {
    setActiveTask(null);
    setTasks(dragStartTasksRef.current);
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            projects={projects}
            projectColor={projectColor}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskListItem
            task={activeTask}
            projects={projects}
            variant="card"
            projectColor={projectColor}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
```

Expected: no errors, all existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/kanban-card.tsx src/components/tasks/kanban-column.tsx \
  src/components/tasks/kanban-board.tsx
git commit -m "Switch Kanban board to @dnd-kit/sortable for persisted drag-to-reorder"
```

---

### Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Automated checks**

```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
```

Expected: all pass with no errors.

- [ ] **Step 2: Manual browser walkthrough**

Using the dev server, logged in as `demo@example.com` / `password123`, on a project with several
tasks in each column:

1. Drag a card and hover it over different cards within the same column — confirm siblings
   visibly slide to make room as you hover, before you even drop.
2. Drop it in a new position within the same column. Reload the page — confirm the new order
   persisted.
3. Drag a card into a different column, hovering over various cards in that column before
   dropping — confirm it animates into the exact hovered position (not always appended to the
   end), the card's status updates, and (if dropped into Completed) a `TASK_COMPLETED` activity
   entry appears in the Activity feed.
4. Start a drag, move it into a different column, then press Escape — confirm the card fully
   reverts to its original column and position (not left in the column it was hovering over when
   cancelled).
5. Toggle a task's completion via its checkbox (not drag, e.g. on `/today`) — confirm it still
   works and the task lands at the end of the Completed column on the project's Kanban board.
6. Confirm `/today`, `/upcoming`, `/completed` still show their existing due-date/priority/
   completed-date ordering, unaffected by any Kanban drags.
7. Check the browser console for errors throughout — expect none.

- [ ] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-24-kanban-drag-reorder.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-24-kanban-drag-reorder.md
git commit -m "Mark Kanban drag-to-reorder plan complete after manual verification"
```
