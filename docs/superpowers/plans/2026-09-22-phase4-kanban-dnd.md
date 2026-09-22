# Phase 4: Project Details Kanban + Drag-and-Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat task list on `/projects/[id]` with a three-column Kanban board (To Do / In Progress / Completed) where dragging a card to another column moves it there instantly and persists the change, reusing Phase 3's `updateTaskStatus` action unchanged.

**Architecture:** A new Client Component `KanbanBoard` wraps `@dnd-kit/core`'s `DndContext`, holding an optimistic local copy of the task list that re-syncs from the server-provided prop whenever it changes (i.e., after any Server Action's `revalidatePath`). Each column is a droppable (`useDroppable`), each card a draggable (`useDraggable`) wrapping Phase 3's `TaskListItem` (given a new `variant="card"` layout). No new Server Actions, no schema changes — this phase is purely presentational/interaction on top of Phase 3's data layer.

**Tech Stack:** `@dnd-kit/core` (new dependency), React state + `useEffect` for optimistic sync, everything else reused from Phases 1–3.

**Design doc:** `docs/superpowers/specs/2026-09-22-phase4-kanban-dnd-design.md`

---

### Task 1: Install dnd-kit

**Files:**
- Modify: `package.json`, `package-lock.json`

- [x] **Step 1: Install**

```bash
npm install @dnd-kit/core
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (nothing imports it yet, but confirms the install didn't break anything).

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add @dnd-kit/core"
```

---

### Task 2: Add a card layout variant to TaskListItem

**Files:**
- Modify: `src/components/tasks/task-list-item.tsx`

This is Phase 3's existing file — the current row layout becomes the default (`variant="row"`), and
a new `variant="card"` branch is added for the Kanban board. No existing behavior changes for
current callers (none pass `variant`, so they keep getting the row layout).

- [x] **Step 1: Add the variant prop and card layout**

Replace the full contents of `src/components/tasks/task-list-item.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/actions/tasks";
import { formatDueDate } from "@/lib/format-due-date";
import { TaskFormSheet } from "./task-form-sheet";
import type { TaskInput } from "@/lib/validations/task";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type TaskListItemData = TaskInput & { id: string };

export function TaskListItem({
  task,
  projects,
  variant = "row",
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
  variant?: "row" | "card";
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isCompleted = task.status === "COMPLETED";
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const dueDateInfo = formatDueDate(dueDateObj);

  function handleToggle() {
    const nextStatus = isCompleted ? "TODO" : "COMPLETED";
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  const dueDateChip = dueDateInfo.label ? (
    <span
      className={cn(
        "text-xs",
        dueDateInfo.variant === "overdue" && "text-destructive",
        dueDateInfo.variant === "today" && "font-medium text-foreground",
        dueDateInfo.variant === "upcoming" && "text-muted-foreground"
      )}
    >
      {dueDateInfo.label}
    </span>
  ) : null;

  const editSheet = (
    <TaskFormSheet
      open={editOpen}
      onOpenChange={setEditOpen}
      projects={projects}
      defaultProjectId={task.projectId}
      task={task}
    />
  );

  if (variant === "card") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
        <div className="flex items-start gap-2">
          <Checkbox checked={isCompleted} disabled={isPending} onCheckedChange={handleToggle} />
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className={cn(
              "flex-1 text-left text-sm",
              isCompleted && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </button>
        </div>
        <div className="flex items-center gap-2 pl-6">
          <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
          {dueDateChip}
        </div>
        {editSheet}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Checkbox checked={isCompleted} disabled={isPending} onCheckedChange={handleToggle} />
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className={cn(
          "flex-1 text-left text-sm",
          isCompleted && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </button>
      <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
      {dueDateChip}
      {editSheet}
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/tasks/task-list-item.tsx
git commit -m "Add card layout variant to TaskListItem"
```

---

### Task 3: Draggable Kanban card

**Files:**
- Create: `src/components/tasks/kanban-card.tsx`

- [x] **Step 1: Implement**

`src/components/tasks/kanban-card.tsx`:
```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

export function KanbanCard({
  task,
  projects,
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : undefined}
    >
      <TaskListItem task={task} projects={projects} variant="card" />
    </div>
  );
}
```

The drag listeners go on the outer div, not on the checkbox/title inside `TaskListItem` — this
works alongside normal clicks because `KanbanBoard` (Task 5) configures `PointerSensor` with a
minimum drag distance, so a plain click (no pointer movement) never activates a drag and reaches
the checkbox/button's own click handler normally; only a deliberate press-and-move starts a drag.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/tasks/kanban-card.tsx
git commit -m "Add draggable Kanban card"
```

---

### Task 4: Droppable Kanban column

**Files:**
- Create: `src/components/tasks/kanban-column.tsx`

- [x] **Step 1: Implement**

`src/components/tasks/kanban-column.tsx`:
```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
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
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: TaskListItemData[];
  projects: { id: string; name: string }[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-3",
        isOver && "bg-muted"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{COLUMN_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} projects={projects} />
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/tasks/kanban-column.tsx
git commit -m "Add droppable Kanban column"
```

---

### Task 5: Kanban board with optimistic drag-and-drop

**Files:**
- Create: `src/components/tasks/kanban-board.tsx`

- [x] **Step 1: Implement**

`src/components/tasks/kanban-board.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { updateTaskStatus } from "@/actions/tasks";
import { TASK_STATUSES } from "@/lib/validations/task";
import { KanbanColumn } from "./kanban-column";
import type { TaskListItemData } from "./task-list-item";

export function KanbanBoard({
  initialTasks,
  projects,
}: {
  initialTasks: TaskListItemData[];
  projects: { id: string; name: string }[];
}) {
  const [tasks, setTasks] = useState(initialTasks);

  // Re-sync whenever the server-provided list changes — e.g. any create/edit/delete/checkbox
  // action elsewhere on the page triggers revalidatePath and this page re-renders with fresh
  // data. This also corrects the optimistic move below if its guess at column order was off.
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as (typeof TASK_STATUSES)[number] | undefined;
    if (!newStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = tasks;
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    updateTaskStatus(taskId, newStatus).then((result) => {
      if (!result.success) {
        setTasks(previousTasks);
        toast.error(result.error);
      }
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-4 md:flex-row">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            projects={projects}
          />
        ))}
      </div>
    </DndContext>
  );
}
```

`tasks.filter((t) => t.status === status)` preserves each task's relative order from the original
(server-sorted) array, so columns stay priority/due-date sorted even though grouping now happens
client-side. After an optimistic move, the dragged task keeps its old array position — a real
sort only happens again once the next server round-trip's data arrives via the effect above — so
its position within the new column's priority order may be briefly approximate. That's an
accepted, self-correcting trade-off, not a bug.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/tasks/kanban-board.tsx
git commit -m "Add Kanban board with optimistic drag-and-drop"
```

---

### Task 6: Wire the Kanban board into the project detail page

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [x] **Step 1: Replace the flat task list with the Kanban board**

In `src/app/(dashboard)/projects/[id]/page.tsx`, change the import of `TaskListItem` to import
`KanbanBoard` instead, and replace the non-empty-state branch's rendering:

```tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { AddTaskButton } from "@/components/tasks/add-task-button";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { TaskListItemData } from "@/components/tasks/task-list-item";
import type { ProjectInput } from "@/lib/validations/project";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      tasks: {
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const allProjects = await prisma.project.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const { completedCount, totalCount, percent } = computeProjectProgress(
    project.tasks.map((task) => task.status)
  );

  const taskItems: TaskListItemData[] = project.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description ? (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
          <EditProjectButton
            project={{
              id: project.id,
              name: project.name,
              description: project.description ?? "",
              color: project.color as ProjectInput["color"],
              status: project.status,
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {totalCount === 0
              ? "No tasks yet"
              : `${completedCount}/${totalCount} tasks · ${percent}%`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Tasks</h2>
        <AddTaskButton projects={allProjects} defaultProjectId={project.id} />
      </div>

      {taskItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No tasks yet.</p>
          <AddTaskButton projects={allProjects} defaultProjectId={project.id} label="Add Task" />
        </div>
      ) : (
        <KanbanBoard initialTasks={taskItems} projects={allProjects} />
      )}
    </div>
  );
}
```

The header/progress-bar/data-fetching logic is unchanged from Phase 3 — only the final rendering
branch swaps the flat list for the Kanban board.

- [x] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds; `/projects/[id]` still listed in the route table.

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/projects/[id]/page.tsx"
git commit -m "Wire Kanban board into the project detail page"
```

---

### Task 7: Final verification

- [x] **Step 1: Automated checks**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: all four succeed with no errors. (No new automated tests are added in this phase —
there's no new pure logic to unit-test; drag-and-drop is UI interaction verified manually below,
consistent with this project's "unit tests for logic only" policy from Phase 1.)

- [x] **Step 2: Manual browser walkthrough**

`npm run dev`, log in as the seeded demo user (`demo@example.com` / `password123`), open the
Client Website project:

1. Confirm its 4 tasks appear in the correct columns: 3 in To Do (or split To Do/In Progress if
   any were left in progress from earlier testing — check current seed/demo state) and 1 in
   Completed, matching each task's `status`
2. Drag a To Do card into the In Progress column — confirm it snaps there immediately (no
   loading flash), then reload the page and confirm it's still in In Progress (i.e. the move
   actually persisted, not just a local visual change)
3. Drag a task into Completed — confirm the header progress bar/count updates immediately
4. With the board showing, click "Add Task" and create a new task — confirm it appears in the
   correct column without a manual page refresh (this exercises the `useEffect` resync path)
5. Click a card's title — confirm the edit sheet still opens correctly and editing/deleting still
   works exactly as in Phase 3
6. Click a card's checkbox directly — confirm it still toggles complete/incomplete without
   accidentally starting a drag
7. Narrow the browser to a mobile width — confirm the three columns stack vertically and dragging
   still works
8. Check the browser console for errors throughout — expect none

**Found during this pass:** step 8 surfaced a real hydration mismatch after step 2's reload —
`DndContext`'s auto-generated `aria-describedby` id (`DndDescribedBy-0` on the client vs.
`DndDescribedBy-1` from the server) differed between SSR and hydration, because dnd-kit's internal
id counter is module-level state that persists across requests in the same Node server process but
always restarts at 0 on a fresh client load. Fixed by passing a stable `id="kanban-board"` prop to
`DndContext` in `kanban-board.tsx`, which makes the generated ids deterministic. Re-verified clean
across multiple reloads afterward. Documented in `CLAUDE.md` for future dnd-kit usage.

- [x] **Step 3: Clean up test data**

Revert any task status changes made purely for testing (e.g. via the UI) back to a state you're
comfortable with as the ongoing dev fixture, or leave them — this phase doesn't require restoring
exact seed state since status changes are expected, normal usage.

- [x] **Step 4: Update plan status**

Mark all checkboxes in this plan complete once every step above has actually passed.
