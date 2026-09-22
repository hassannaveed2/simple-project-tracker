# Project Color Theming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use each project's own stored color to visually tint the project list, a project's own detail page header, its Kanban cards, and project-grouped task list headings — with soft gradients on card/header-sized surfaces and a flat accent border on the smaller group-heading surface.

**Architecture:** One new lookup module (`project-color-styles.ts`, keyed by the 8 existing `PROJECT_COLORS` hex values) supplies three Tailwind class sets. `ProjectCard` and the Project Detail header consume it directly (they already have `project.color` in scope). Kanban cards need `projectColor` threaded down through `KanbanBoard → KanbanColumn → KanbanCard → TaskListItem` as a single value (a board is always one project). Project-grouped task list headings need `groupTasksByProject`/`ProjectTaskGroup` extended with a `projectColor` field, sourced from a `color: true` addition to the handful of Prisma queries that already select `project: { id, name }` for this pipeline.

**Tech Stack:** No new dependencies — pure Tailwind gradient/color utility classes.

**Design doc:** `docs/superpowers/specs/2026-09-22-project-color-theming-design.md`

---

### Task 1: Project color style lookups

**Files:**
- Create: `src/lib/project-color-styles.ts`

- [x] **Step 1: Implement**

`src/lib/project-color-styles.ts`:
```ts
import { PROJECT_COLORS } from "@/lib/validations/project";

type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_COLOR_CARD_CLASSES: Record<ProjectColor, string> = {
  "#6366f1":
    "bg-gradient-to-br from-indigo-50 to-background border-indigo-200 dark:from-indigo-950/40 dark:to-background dark:border-indigo-900",
  "#22c55e":
    "bg-gradient-to-br from-green-50 to-background border-green-200 dark:from-green-950/40 dark:to-background dark:border-green-900",
  "#f97316":
    "bg-gradient-to-br from-orange-50 to-background border-orange-200 dark:from-orange-950/40 dark:to-background dark:border-orange-900",
  "#ef4444":
    "bg-gradient-to-br from-red-50 to-background border-red-200 dark:from-red-950/40 dark:to-background dark:border-red-900",
  "#0ea5e9":
    "bg-gradient-to-br from-sky-50 to-background border-sky-200 dark:from-sky-950/40 dark:to-background dark:border-sky-900",
  "#a855f7":
    "bg-gradient-to-br from-purple-50 to-background border-purple-200 dark:from-purple-950/40 dark:to-background dark:border-purple-900",
  "#eab308":
    "bg-gradient-to-br from-yellow-50 to-background border-yellow-200 dark:from-yellow-950/40 dark:to-background dark:border-yellow-900",
  "#64748b":
    "bg-gradient-to-br from-slate-50 to-background border-slate-200 dark:from-slate-950/40 dark:to-background dark:border-slate-900",
};

export const PROJECT_COLOR_HEADER_CLASSES: Record<ProjectColor, string> = {
  "#6366f1":
    "bg-gradient-to-r from-indigo-100 via-indigo-50 to-transparent dark:from-indigo-950/30 dark:via-indigo-950/10 dark:to-transparent",
  "#22c55e":
    "bg-gradient-to-r from-green-100 via-green-50 to-transparent dark:from-green-950/30 dark:via-green-950/10 dark:to-transparent",
  "#f97316":
    "bg-gradient-to-r from-orange-100 via-orange-50 to-transparent dark:from-orange-950/30 dark:via-orange-950/10 dark:to-transparent",
  "#ef4444":
    "bg-gradient-to-r from-red-100 via-red-50 to-transparent dark:from-red-950/30 dark:via-red-950/10 dark:to-transparent",
  "#0ea5e9":
    "bg-gradient-to-r from-sky-100 via-sky-50 to-transparent dark:from-sky-950/30 dark:via-sky-950/10 dark:to-transparent",
  "#a855f7":
    "bg-gradient-to-r from-purple-100 via-purple-50 to-transparent dark:from-purple-950/30 dark:via-purple-950/10 dark:to-transparent",
  "#eab308":
    "bg-gradient-to-r from-yellow-100 via-yellow-50 to-transparent dark:from-yellow-950/30 dark:via-yellow-950/10 dark:to-transparent",
  "#64748b":
    "bg-gradient-to-r from-slate-100 via-slate-50 to-transparent dark:from-slate-950/30 dark:via-slate-950/10 dark:to-transparent",
};

export const PROJECT_COLOR_ACCENT_CLASSES: Record<ProjectColor, string> = {
  "#6366f1": "border-l-indigo-500",
  "#22c55e": "border-l-green-500",
  "#f97316": "border-l-orange-500",
  "#ef4444": "border-l-red-500",
  "#0ea5e9": "border-l-sky-500",
  "#a855f7": "border-l-purple-500",
  "#eab308": "border-l-yellow-500",
  "#64748b": "border-l-slate-500",
};
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/lib/project-color-styles.ts
git commit -m "Add project color gradient/accent style lookups"
```

---

### Task 2: Gradient `ProjectCard`

**Files:**
- Modify: `src/components/projects/project-card.tsx`

- [x] **Step 1: Implement**

Add the import:
```ts
import { PROJECT_COLOR_CARD_CLASSES } from "@/lib/project-color-styles";
```

Change the outer container from:
```tsx
<div className="flex flex-col gap-3 rounded-lg border p-4">
```
to:
```tsx
<div
  className={cn(
    "flex flex-col gap-3 rounded-lg border p-4",
    PROJECT_COLOR_CARD_CLASSES[project.color]
  )}
>
```
(add `import { cn } from "@/lib/utils";` alongside the other imports — this file doesn't currently
import it).

Remove the now-redundant color dot — delete this block from the header row:
```tsx
<span
  className="h-2.5 w-2.5 shrink-0 rounded-full"
  style={{ backgroundColor: project.color }}
/>
```
leaving the `Link` as the only child of that `flex items-center gap-2` div.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/projects/project-card.tsx
git commit -m "Give ProjectCard a soft gradient background from its project color"
```

---

### Task 3: Gradient Project Detail header

**Files:**
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx`

- [x] **Step 1: Implement**

Add the import:
```ts
import { PROJECT_COLOR_HEADER_CLASSES } from "@/lib/project-color-styles";
```

Wrap the existing header block — currently:
```tsx
<div className="space-y-3">
  <div className="flex items-start justify-between gap-2">
    ...
  </div>
  <div className="space-y-1">
    ...
  </div>
</div>
```
— by adding the gradient class and some padding/rounding so the wash reads as a deliberate band,
not a stray background color:
```tsx
<div className={`space-y-3 rounded-lg p-4 ${PROJECT_COLOR_HEADER_CLASSES[project.color]}`}>
  <div className="flex items-start justify-between gap-2">
    ...
  </div>
  <div className="space-y-1">
    ...
  </div>
</div>
```
(everything inside is unchanged — only the wrapping `div`'s className changes).

Also pass the project's color into `KanbanBoard` — change:
```tsx
<KanbanBoard initialTasks={taskItems} projects={allProjects} />
```
to:
```tsx
<KanbanBoard initialTasks={taskItems} projects={allProjects} projectColor={project.color} />
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: An error is expected here — `KanbanBoard` doesn't accept a `projectColor` prop yet.
That's fixed in Task 4; this step is a checkpoint, not a hard gate.

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/projects/[slug]/page.tsx"
git commit -m "Give Project Detail header a soft gradient background from its project color"
```

---

### Task 4: Thread `projectColor` into Kanban cards

**Files:**
- Modify: `src/components/tasks/kanban-board.tsx`
- Modify: `src/components/tasks/kanban-column.tsx`
- Modify: `src/components/tasks/kanban-card.tsx`
- Modify: `src/components/tasks/task-list-item.tsx`

- [x] **Step 1: Update `KanbanBoard`**

Add a `projectColor: string` prop and pass it through to every `KanbanColumn`:
```tsx
export function KanbanBoard({
  initialTasks,
  projects,
  projectColor,
}: {
  initialTasks: TaskListItemData[];
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
```
and in the render:
```tsx
<KanbanColumn
  key={status}
  status={status}
  tasks={tasks.filter((t) => t.status === status)}
  projects={projects}
  projectColor={projectColor}
/>
```

- [x] **Step 2: Update `KanbanColumn`**

Add the same prop and pass it to `KanbanCard`:
```tsx
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
```
and:
```tsx
{tasks.map((task) => (
  <KanbanCard key={task.id} task={task} projects={projects} projectColor={projectColor} />
))}
```

- [x] **Step 3: Update `KanbanCard`**

Add the same prop and pass it to `TaskListItem`:
```tsx
export function KanbanCard({
  task,
  projects,
  projectColor,
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
```
and:
```tsx
<TaskListItem task={task} projects={projects} variant="card" projectColor={projectColor} />
```

- [x] **Step 4: Update `TaskListItem`**

Add an optional `projectColor` prop, used only in the `"card"` variant branch. Add the import:
```ts
import { PROJECT_COLOR_CARD_CLASSES } from "@/lib/project-color-styles";
```
Update the function signature:
```tsx
export function TaskListItem({
  task,
  projects,
  variant = "row",
  projectColor,
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
  variant?: "row" | "card";
  projectColor?: string;
}) {
```
And in the `"card"` variant's returned JSX, change the outer `div`'s className from:
```tsx
<div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
```
to:
```tsx
<div
  className={cn(
    "flex flex-col gap-2 rounded-lg border p-3",
    projectColor
      ? PROJECT_COLOR_CARD_CLASSES[projectColor as keyof typeof PROJECT_COLOR_CARD_CLASSES]
      : "bg-background"
  )}
>
```
(`projectColor` is typed as a plain optional `string` here — like `UpcomingTaskData.priority`
elsewhere in this codebase, it isn't threaded through as the exact literal union, so the same
`as keyof typeof` pattern applies. The `"row"` variant branch is untouched — it never receives or
uses this prop.)

- [x] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (this also resolves the expected Task 3 checkpoint error).

- [x] **Step 6: Commit**

```bash
git add src/components/tasks/kanban-board.tsx src/components/tasks/kanban-column.tsx src/components/tasks/kanban-card.tsx src/components/tasks/task-list-item.tsx
git commit -m "Thread project color into Kanban card backgrounds"
```

---

### Task 5: Extend `groupTasksByProject` with `projectColor`

**Files:**
- Modify: `src/lib/group-tasks-by-project.ts`
- Modify: `src/lib/group-tasks-by-project.test.ts`

- [x] **Step 1: Update the test**

`src/lib/group-tasks-by-project.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { groupTasksByProject } from "./group-tasks-by-project";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

function makeTask(
  overrides: Partial<TaskListItemData> & { id: string; projectId: string } & {
    projectName: string;
    projectColor: string;
  }
): TaskListItemData & { projectName: string; projectColor: string } {
  return {
    title: "Task",
    description: "",
    notes: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    ...overrides,
  };
}

describe("groupTasksByProject", () => {
  it("groups tasks under the same project together", () => {
    const tasks = [
      makeTask({ id: "1", projectId: "p1", projectName: "Client Website", projectColor: "#6366f1" }),
      makeTask({ id: "2", projectId: "p1", projectName: "Client Website", projectColor: "#6366f1" }),
    ];
    const groups = groupTasksByProject(tasks);
    expect(groups).toEqual([
      {
        projectId: "p1",
        projectName: "Client Website",
        projectColor: "#6366f1",
        tasks: [tasks[0], tasks[1]],
      },
    ]);
  });

  it("creates separate groups per project, preserving first-seen order", () => {
    const tasks = [
      makeTask({ id: "1", projectId: "p2", projectName: "Personal Website", projectColor: "#22c55e" }),
      makeTask({ id: "2", projectId: "p1", projectName: "Client Website", projectColor: "#6366f1" }),
    ];
    const groups = groupTasksByProject(tasks);
    expect(groups.map((g) => g.projectId)).toEqual(["p2", "p1"]);
  });

  it("returns an empty array for no tasks", () => {
    expect(groupTasksByProject([])).toEqual([]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- --run group-tasks-by-project`
Expected: FAIL — the first test's `toEqual` now expects a `projectColor` field the implementation
doesn't produce yet.

- [x] **Step 3: Implement**

`src/lib/group-tasks-by-project.ts`:
```ts
import type { TaskListItemData } from "@/components/tasks/task-list-item";

export type ProjectTaskGroup = {
  projectId: string;
  projectName: string;
  projectColor: string;
  tasks: TaskListItemData[];
};

export function groupTasksByProject(
  tasks: (TaskListItemData & { projectName: string; projectColor: string })[]
): ProjectTaskGroup[] {
  const map = new Map<string, ProjectTaskGroup>();
  for (const task of tasks) {
    const existing = map.get(task.projectId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(task.projectId, {
        projectId: task.projectId,
        projectName: task.projectName,
        projectColor: task.projectColor,
        tasks: [task],
      });
    }
  }
  return Array.from(map.values());
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- --run group-tasks-by-project`
Expected: PASS (3 tests)

- [x] **Step 5: Commit**

```bash
git add src/lib/group-tasks-by-project.ts src/lib/group-tasks-by-project.test.ts
git commit -m "Add projectColor to groupTasksByProject"
```

---

### Task 6: Accent border on `TaskGroupList` headings

**Files:**
- Modify: `src/components/tasks/task-group-list.tsx`

- [x] **Step 1: Implement**

```tsx
import { cn } from "@/lib/utils";
import { PROJECT_COLOR_ACCENT_CLASSES } from "@/lib/project-color-styles";
import { TaskListItem } from "./task-list-item";
import type { ProjectTaskGroup } from "@/lib/group-tasks-by-project";

export function TaskGroupList({
  groups,
  projects,
  emptyMessage,
}: {
  groups: ProjectTaskGroup[];
  projects: { id: string; name: string }[];
  emptyMessage: string;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.projectId}
          className={cn(
            "space-y-2 border-l-4 pl-3",
            PROJECT_COLOR_ACCENT_CLASSES[
              group.projectColor as keyof typeof PROJECT_COLOR_ACCENT_CLASSES
            ]
          )}
        >
          <h3 className="text-sm font-medium text-muted-foreground">{group.projectName}</h3>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskListItem key={task.id} task={task} projects={projects} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: An error is expected here too — the call sites (Today page, Dashboard) don't supply
`projectColor` on their task objects yet. Fixed in Task 7.

- [x] **Step 3: Commit**

```bash
git add src/components/tasks/task-group-list.tsx
git commit -m "Add project color accent border to TaskGroupList headings"
```

---

### Task 7: Supply `projectColor` from the Today page and Dashboard

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [x] **Step 1: Update `today/page.tsx`**

All three task queries currently do `include: { project: { select: { id: true, name: true } } }` —
add `color: true` to each of the three (`overdueRaw`, `dueTodayRaw`, `noDueDateRaw` queries), so
each becomes:
```ts
include: { project: { select: { id: true, name: true, color: true } } },
```

Then update the shared `toTaskItems` mapper to carry it through:
```ts
function toTaskItems(rawTasks: typeof overdueRaw) {
  return rawTasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
    projectName: task.project.name,
    projectColor: task.project.color,
  }));
}
```

- [x] **Step 2: Update `page.tsx` (Dashboard)**

The `todaysTasksRaw` query currently does
`include: { project: { select: { id: true, name: true } } }` — add `color: true`:
```ts
include: { project: { select: { id: true, name: true, color: true } } },
```

Then update the `todayGroups` mapping:
```ts
const todayGroups = groupTasksByProject(
  todaysTasksRaw.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
    projectName: task.project.name,
    projectColor: task.project.color,
  }))
);
```

- [x] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (this also resolves the expected Task 6 checkpoint error).

- [x] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/today/page.tsx" "src/app/(dashboard)/page.tsx"
git commit -m "Supply project color to Today/Dashboard task groupings"
```

---

### Task 8: Final verification

**Files:** none (verification only)

- [x] **Step 1: Automated checks**

Run, in order:
```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
```
Expected: all pass with no errors.

- [x] **Step 2: Manual browser walkthrough**

Start the dev server (`npm run dev`) and, logged in as `demo@example.com` / `password123`, check
**both light and dark mode**:

1. `/projects` — confirm "Client Website" (indigo) and "Personal Website" (green) render with
   visibly distinct soft gradient card backgrounds, and that the redundant color dot is gone.
2. Dashboard's Recent Projects section — same two cards, same gradient treatment (confirms
   `ProjectCard` reuse works identically here).
3. Open the Client Website project page — confirm the header area has a soft indigo gradient
   wash, and every Kanban card on the board has a matching soft indigo gradient background.
   Repeat on Personal Website and confirm it's green instead.
4. `/today` — confirm each project-name group heading has a colored left-border accent matching
   that project's color (indigo for Client Website tasks, green for Personal Website tasks), and
   that individual task rows underneath are NOT tinted (only the group heading/border is).
5. Dashboard's "Today's Tasks" section — same accent-border check.
6. `/upcoming` and `/completed` — confirm these are visually unchanged (no project coloring),
   confirming the explicit scope boundary held.
7. Confirm the warm terracotta "Add Task"/primary buttons still look the same everywhere — the
   one consistent action color is undisturbed by all of the above.
8. Check the browser console for errors throughout — expect none.

- [x] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-22-project-color-theming.md
```

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-project-color-theming.md
git commit -m "Mark project color theming plan complete after manual verification"
```
