# Phase 11: Desktop Responsive Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix five root-caused desktop layout bugs: Kanban drag growing the page width unboundedly, the sidebar scrolling away with the page, textareas growing forever, missing task title truncation, and a non-scrolling edit sheet.

**Architecture:** Each fix is isolated and independently verifiable — no shared new abstractions. The Kanban fix (Task 1) switches from an in-place CSS transform to `@dnd-kit/core`'s `DragOverlay` (a portal-based, `position: fixed` rendering layer immune to ancestor-overflow growth). The layout fix (Task 2) switches the dashboard shell from `min-h-screen` (unbounded) to `h-screen overflow-hidden` (height-locked) with `overflow-y-auto` only on `<main>`. The remaining three are small, targeted className additions to existing shared components.

**Tech Stack:** No new dependencies — `DragOverlay` is already part of the installed `@dnd-kit/core` (confirmed via its type definitions before writing this plan).

**Design doc:** `docs/superpowers/specs/2026-09-23-phase11-desktop-responsive-fixes-design.md`

---

### Task 1: Kanban `DragOverlay`

**Files:**
- Modify: `src/components/tasks/kanban-board.tsx`
- Modify: `src/components/tasks/kanban-card.tsx`

- [ ] **Step 1: Update `kanban-card.tsx` — stop transforming the source node**

Replace the full contents of `src/components/tasks/kanban-card.tsx`:

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : undefined}
    >
      <TaskListItem task={task} projects={projects} variant="card" projectColor={projectColor} />
    </div>
  );
}
```

(`transform`/`style` are gone entirely — no longer needed since `DragOverlay`, added in Step 2,
now renders the moving visual. The original card just dims to `opacity-50` at its original slot
while dragging, exactly as before.)

- [ ] **Step 2: Update `kanban-board.tsx` — track the active task and render `DragOverlay`**

Replace the full contents of `src/components/tasks/kanban-board.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { updateTaskStatus } from "@/actions/tasks";
import { TASK_STATUSES } from "@/lib/validations/task";
import { KanbanColumn } from "./kanban-column";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

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

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
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
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
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

(`onDragCancel` clears `activeTask` too — e.g. pressing Escape mid-drag — so a stale overlay can
never linger.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/kanban-board.tsx src/components/tasks/kanban-card.tsx
git commit -m "Use DragOverlay for Kanban cards instead of transforming the source node"
```

---

### Task 2: Height-locked dashboard layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `src/app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden">
          <MobileNav />
          <span className="font-semibold">Task Tracker</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
```

(`min-h-screen` → `h-screen overflow-hidden` on both the outer row and inner column locks the
whole shell to the viewport height instead of letting it grow with content; `<main>` gains
`overflow-y-auto` so it becomes the only scrolling region; `<header>` gains `shrink-0` so it can't
be compressed by the flex column now that the column has a fixed height. `Sidebar` itself needs no
changes — as a flex item in a row with a definite height, it stretches to fill that height via
flexbox's default `align-items: stretch`.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/layout.tsx"
git commit -m "Lock dashboard layout to viewport height so only main content scrolls"
```

---

### Task 3: Textarea max-height

**Files:**
- Modify: `src/components/ui/textarea.tsx`

- [ ] **Step 1: Implement**

In `src/components/ui/textarea.tsx`, change the className string from:
```
"flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
```
to:
```
"flex field-sizing-content min-h-16 max-h-40 w-full overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40"
```
(added `max-h-40` and `overflow-y-auto` right after the existing `min-h-16`). This is a shared
primitive already used by both `TaskFormSheet` (Description, Notes) and `ProjectFormSheet`
(Description) — no call-site changes needed, both benefit automatically.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/textarea.tsx
git commit -m "Cap Textarea growth with max-height and internal scroll"
```

---

### Task 4: Task title truncation

**Files:**
- Modify: `src/components/tasks/task-list-item.tsx`

- [ ] **Step 1: Implement**

In `src/components/tasks/task-list-item.tsx`, the "card" variant's title button currently has:
```tsx
className={cn(
  "text-left text-sm",
  isCompleted && "text-muted-foreground line-through"
)}
```
Change to:
```tsx
className={cn(
  "min-w-0 w-full truncate text-left text-sm",
  isCompleted && "text-muted-foreground line-through"
)}
```

The "row" variant's title button currently has:
```tsx
className={cn(
  "flex-1 text-left text-sm",
  isCompleted && "text-muted-foreground line-through"
)}
```
Change to:
```tsx
className={cn(
  "min-w-0 flex-1 truncate text-left text-sm",
  isCompleted && "text-muted-foreground line-through"
)}
```

(`min-w-0` is required alongside `truncate` on a flex item — flexbox's default `min-width: auto`
otherwise uses the text's untruncated intrinsic width as a floor, silently defeating `truncate`.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/task-list-item.tsx
git commit -m "Truncate long task titles instead of overflowing their row/card"
```

---

### Task 5: Scrollable sheet content

**Files:**
- Modify: `src/components/ui/sheet.tsx`

- [ ] **Step 1: Implement**

In `src/components/ui/sheet.tsx`'s `SheetContent`, the base (non-side-specific) className string
currently is:
```
"fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500"
```
Change to:
```
"fixed z-50 flex flex-col gap-4 overflow-y-auto bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500"
```
(added `overflow-y-auto` right after `flex flex-col gap-4`). This is a shared primitive, so any
sheet in the app — not just the task form — now scrolls internally if its content is taller than
the viewport, instead of clipping silently.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "Make sheet content scrollable when it exceeds the viewport"
```

---

### Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Automated checks**

Run, in order:
```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
```
Expected: all pass with no errors.

- [ ] **Step 2: Manual browser walkthrough**

Start the dev server (`npm run dev`) and, logged in as `demo@example.com` / `password123`:

1. Open a project's detail page (Kanban board). Drag a task card slowly toward the right edge of
   the browser window and past it — confirm the page's horizontal scrollbar/width never changes,
   and confirm a visible card follows the pointer (the `DragOverlay`) while the original slot dims.
   Drop it in a different column and confirm the status update still applies correctly (same as
   before this phase). Start a drag and press Escape — confirm the overlay disappears cleanly and
   the card returns to its original column undimmed.
2. On any page with enough content to exceed the viewport height (e.g. the Dashboard, or a project
   with several tasks), scroll down — confirm the Sidebar stays fixed in place and remains
   clickable, and only the main content area scrolls. Resize the browser window shorter to make
   this easy to trigger.
3. Open a task's Add/Edit sheet, click into Notes, and paste or type several paragraphs — confirm
   the field stops growing once it reaches its cap (~10 lines) and shows its own internal scrollbar
   from then on, rather than pushing the rest of the sheet down indefinitely.
4. Shrink the browser window height (or add enough content) so the whole task edit sheet is taller
   than the viewport — confirm the sheet itself scrolls and the Save/Cancel buttons are reachable.
5. Create or find a task with a very long, unbroken title (e.g. a 100+ character string with no
   spaces) — confirm it truncates with an ellipsis on both the Kanban card and a row-variant view
   (e.g. `/today`), instead of widening its container.
6. Check the browser console for errors throughout — expect none (aside from the
   already-documented, pre-existing intermittent Radix `useId` hydration warning).

- [ ] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-23-phase11-desktop-responsive-fixes.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-23-phase11-desktop-responsive-fixes.md
git commit -m "Mark Phase 11 desktop responsive fixes plan complete after manual verification"
```
