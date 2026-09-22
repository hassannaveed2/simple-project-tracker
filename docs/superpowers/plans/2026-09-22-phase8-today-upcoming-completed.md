# Phase 8: Today, Upcoming, Completed Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/today`, `/upcoming`, and `/completed` placeholders with real content — `/today`'s three project-grouped sections (Overdue/Due Today/No Due Date), `/upcoming`'s date-grouped list, and `/completed`'s searchable/filterable list where un-completing a task doubles as "restore."

**Architecture:** Two new pure, tested grouping helpers (`groupTasksByProject`, `groupTasksByDueDate`) replace and generalize Phase 7's one-off grouping code, shared across the Dashboard and the new pages. A generalized `TaskGroupList` (moved from `components/dashboard/` to `components/tasks/`, since it's no longer Dashboard-specific) renders any project-grouped task list with a caller-supplied empty message. `/completed`'s filters are plain `searchParams`-driven Server Component state, with a small Client Component only for navigating on filter change.

**Tech Stack:** No new dependencies — everything reused from Phases 1–7.

**Design doc:** `docs/superpowers/specs/2026-09-22-phase8-today-upcoming-completed-design.md`

---

### Task 1: `groupTasksByProject` helper (TDD)

**Files:**
- Create: `src/lib/group-tasks-by-project.ts`
- Test: `src/lib/group-tasks-by-project.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/group-tasks-by-project.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { groupTasksByProject } from "./group-tasks-by-project";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

function makeTask(
  overrides: Partial<TaskListItemData> & { id: string; projectId: string } & {
    projectName: string;
  }
): TaskListItemData & { projectName: string } {
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
      makeTask({ id: "1", projectId: "p1", projectName: "Client Website" }),
      makeTask({ id: "2", projectId: "p1", projectName: "Client Website" }),
    ];
    const groups = groupTasksByProject(tasks);
    expect(groups).toEqual([
      { projectId: "p1", projectName: "Client Website", tasks: [tasks[0], tasks[1]] },
    ]);
  });

  it("creates separate groups per project, preserving first-seen order", () => {
    const tasks = [
      makeTask({ id: "1", projectId: "p2", projectName: "Personal Website" }),
      makeTask({ id: "2", projectId: "p1", projectName: "Client Website" }),
    ];
    const groups = groupTasksByProject(tasks);
    expect(groups.map((g) => g.projectId)).toEqual(["p2", "p1"]);
  });

  it("returns an empty array for no tasks", () => {
    expect(groupTasksByProject([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './group-tasks-by-project'`

- [ ] **Step 3: Implement**

`src/lib/group-tasks-by-project.ts`:
```ts
import type { TaskListItemData } from "@/components/tasks/task-list-item";

export type ProjectTaskGroup = {
  projectId: string;
  projectName: string;
  tasks: TaskListItemData[];
};

export function groupTasksByProject(
  tasks: (TaskListItemData & { projectName: string })[]
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
        tasks: [task],
      });
    }
  }
  return Array.from(map.values());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/group-tasks-by-project.ts src/lib/group-tasks-by-project.test.ts
git commit -m "Add groupTasksByProject helper"
```

---

### Task 2: Generalize TaskGroupList and adopt it on the Dashboard

**Files:**
- Create: `src/components/tasks/task-group-list.tsx`
- Delete: `src/components/dashboard/today-tasks-section.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

This is a refactor — the Dashboard's Today's Tasks section should render identically to how
Phase 7 shipped it, just built on the newly-shared helper/component instead of one-off code.

- [ ] **Step 1: Create the generalized component**

`src/components/tasks/task-group-list.tsx`:
```tsx
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
        <div key={group.projectId} className="space-y-2">
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

- [ ] **Step 2: Delete the old Dashboard-specific component**

```bash
rm src/components/dashboard/today-tasks-section.tsx
```

- [ ] **Step 3: Update the Dashboard page to use the shared helper and component**

Replace the full contents of `src/app/(dashboard)/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGreeting } from "@/lib/greeting";
import { toProjectCardData } from "@/lib/project-card-data";
import { groupTasksByProject } from "@/lib/group-tasks-by-project";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskGroupList } from "@/components/tasks/task-group-list";
import { UpcomingTaskRow, type UpcomingTaskData } from "@/components/dashboard/upcoming-task-row";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { ProjectCard } from "@/components/projects/project-card";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export default async function DashboardPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;
  const userName = session!.user.name ?? "there";

  const now = new Date();
  const greeting = getGreeting(now.getUTCHours());
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);
  const calendarWindowStart = addDays(todayStart, -30);
  const calendarWindowEnd = addDays(todayStart, 60);

  const [
    totalProjects,
    activeTasks,
    dueTodayCount,
    completedThisWeek,
    todaysTasksRaw,
    windowTasksRaw,
    recentProjectsRaw,
    allProjectsForTaskForm,
  ] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: { not: "COMPLETED" } } }),
    prisma.task.count({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.task.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: addDays(now, -7) } },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayStart, lt: todayEnd } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "COMPLETED" },
        dueDate: { gte: calendarWindowStart, lt: calendarWindowEnd },
      },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.project.findMany({
      where: { userId },
      include: { tasks: { select: { status: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
    }))
  );

  const windowTaskItems: UpcomingTaskData[] = windowTasksRaw
    .filter((task): task is typeof task & { dueDate: Date } => task.dueDate !== null)
    .map((task) => ({
      id: task.id,
      title: task.title,
      projectName: task.project.name,
      priority: task.priority,
      dueDate: task.dueDate,
    }));

  const upcomingPreview = windowTaskItems
    .filter((task) => task.dueDate >= todayEnd && task.dueDate < addDays(todayEnd, 7))
    .slice(0, 5);

  const recentProjects = recentProjectsRaw.map(toProjectCardData);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {userName}
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s what you have to work on.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Projects" value={totalProjects} />
        <StatCard label="Active Tasks" value={activeTasks} />
        <StatCard label="Due Today" value={dueTodayCount} />
        <StatCard label="Completed This Week" value={completedThisWeek} />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Today&apos;s Tasks</h2>
            <TaskGroupList
              groups={todayGroups}
              projects={allProjectsForTaskForm}
              emptyMessage="You don't have any tasks due today."
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Upcoming Tasks</h2>
            {upcomingPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
            ) : (
              <div className="space-y-2">
                {upcomingPreview.map((task) => (
                  <UpcomingTaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Recent Projects</h2>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create your first project to start organizing your work.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Calendar</h2>
          <DashboardCalendar tasks={windowTaskItems} />
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds. `/` should render exactly as it did after Phase 7 — this task changes
no behavior, only where the grouping logic lives.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/task-group-list.tsx src/components/dashboard/today-tasks-section.tsx "src/app/(dashboard)/page.tsx"
git commit -m "Generalize TaskGroupList and adopt groupTasksByProject on the Dashboard"
```

---

### Task 3: `groupTasksByDueDate` helper (TDD)

**Files:**
- Create: `src/lib/group-tasks-by-due-date.ts`
- Test: `src/lib/group-tasks-by-due-date.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/group-tasks-by-due-date.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { groupTasksByDueDate } from "./group-tasks-by-due-date";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

function makeTask(overrides: Partial<TaskListItemData> & { id: string }): TaskListItemData {
  return {
    title: "Task",
    description: "",
    notes: "",
    projectId: "p1",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    ...overrides,
  };
}

describe("groupTasksByDueDate", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("groups tasks due on the same date together", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: "2026-09-22" }),
      makeTask({ id: "2", dueDate: "2026-09-22" }),
    ];
    const groups = groupTasksByDueDate(tasks, now);
    expect(groups).toEqual([{ label: "Tomorrow", tasks: [tasks[0], tasks[1]] }]);
  });

  it("creates separate groups in date order for different due dates", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: "2026-09-22" }),
      makeTask({ id: "2", dueDate: "2026-09-26" }),
    ];
    const groups = groupTasksByDueDate(tasks, now);
    expect(groups.map((g) => g.label)).toEqual(["Tomorrow", "Sep 26"]);
  });

  it("skips tasks without a due date", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: "" }),
      makeTask({ id: "2", dueDate: "2026-09-22" }),
    ];
    const groups = groupTasksByDueDate(tasks, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './group-tasks-by-due-date'`

- [ ] **Step 3: Implement**

`src/lib/group-tasks-by-due-date.ts`:
```ts
import { formatDueDate } from "./format-due-date";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

export type DueDateTaskGroup = {
  label: string;
  tasks: TaskListItemData[];
};

export function groupTasksByDueDate(
  tasks: TaskListItemData[],
  now: Date = new Date()
): DueDateTaskGroup[] {
  const map = new Map<string, DueDateTaskGroup>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const { label } = formatDueDate(new Date(task.dueDate), now);
    const key = label ?? "Unscheduled";
    const existing = map.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(key, { label: key, tasks: [task] });
    }
  }
  return Array.from(map.values());
}
```

Relies on the caller passing tasks already sorted by due date (ascending) — `Map` preserves
first-seen insertion order, so groups come out in date order as long as the input does. This page
only ever shows tasks due strictly after today (Task 5's query enforces that), so `formatDueDate`
can only return `"Tomorrow"` or a short date like `"Sep 26"` here — never `"Today"`/`"Overdue"` —
which is exactly the header format the spec's own `/upcoming` example uses.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/group-tasks-by-due-date.ts src/lib/group-tasks-by-due-date.test.ts
git commit -m "Add groupTasksByDueDate helper"
```

---

### Task 4: Build the /today page

**Files:**
- Modify: `src/app/(dashboard)/today/page.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the full contents of `src/app/(dashboard)/today/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupTasksByProject } from "@/lib/group-tasks-by-project";
import { TaskGroupList } from "@/components/tasks/task-group-list";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function TodayPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);

  const [overdueRaw, dueTodayRaw, noDueDateRaw, allProjects] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { lt: todayStart } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayStart, lt: todayEnd } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: null },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
    }));
  }

  const overdueGroups = groupTasksByProject(toTaskItems(overdueRaw));
  const dueTodayGroups = groupTasksByProject(toTaskItems(dueTodayRaw));
  const noDueDateGroups = groupTasksByProject(toTaskItems(noDueDateRaw));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Today</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Overdue</h2>
        <TaskGroupList
          groups={overdueGroups}
          projects={allProjects}
          emptyMessage="No overdue tasks."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Due Today</h2>
        <TaskGroupList
          groups={dueTodayGroups}
          projects={allProjects}
          emptyMessage="You don't have any tasks due today."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">No Due Date</h2>
        <TaskGroupList
          groups={noDueDateGroups}
          projects={allProjects}
          emptyMessage="No tasks without a due date."
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/today/page.tsx"
git commit -m "Build the /today page"
```

---

### Task 5: Build the /upcoming page

**Files:**
- Modify: `src/app/(dashboard)/upcoming/page.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the full contents of `src/app/(dashboard)/upcoming/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupTasksByDueDate } from "@/lib/group-tasks-by-due-date";
import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function UpcomingPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);
  const windowEnd = addDays(todayStart, 30);

  const [tasksRaw, allProjects] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayEnd, lt: windowEnd } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const taskItems: TaskListItemData[] = tasksRaw.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  }));

  const groups = groupTasksByDueDate(taskItems);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Upcoming</h1>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-lg font-medium">{group.label}</h2>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <TaskListItem key={task.id} task={task} projects={allProjects} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
```

Rows deliberately don't show project name, matching the spec's own `/upcoming` example (task
titles listed plainly under each date heading, no project mentioned) — unlike `/today`, which the
spec explicitly groups by project.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/upcoming/page.tsx"
git commit -m "Build the /upcoming page"
```

---

### Task 6: Completed page filter bar

**Files:**
- Create: `src/components/completed/completed-filters.tsx`

- [ ] **Step 1: Implement**

`src/components/completed/completed-filters.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export function CompletedFilters({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/completed?${params.toString()}`);
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    updateParam("q", query);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
        <Input
          placeholder="Search completed tasks…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <Select
        defaultValue={searchParams.get("project") ?? "all"}
        onValueChange={(value) => updateParam("project", value)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("period") ?? "all"}
        onValueChange={(value) => updateParam("period", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/completed/completed-filters.tsx
git commit -m "Add completed page filter bar"
```

---

### Task 7: Build the /completed page

**Files:**
- Modify: `src/app/(dashboard)/completed/page.tsx`

- [ ] **Step 1: Replace the placeholder**

Replace the full contents of `src/app/(dashboard)/completed/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CompletedFilters } from "@/components/completed/completed-filters";
import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";

export default async function CompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; project?: string; period?: string }>;
}) {
  const { q, project, period } = await searchParams;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  let completedAfter: Date | undefined;
  if (period === "week") completedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "month") completedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [tasksRaw, allProjects] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        status: "COMPLETED",
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        ...(project ? { projectId: project } : {}),
        ...(completedAfter ? { completedAt: { gte: completedAfter } } : {}),
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const taskItems: TaskListItemData[] = tasksRaw.map((task) => ({
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
      <h1 className="text-2xl font-semibold">Completed</h1>
      <CompletedFilters projects={allProjects} />
      {taskItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed tasks found.</p>
      ) : (
        <div className="space-y-2">
          {taskItems.map((task) => (
            <TaskListItem key={task.id} task={task} projects={allProjects} />
          ))}
        </div>
      )}
    </div>
  );
}
```

Unchecking a task's checkbox here calls the same `updateTaskStatus` `TaskListItem` already uses
everywhere else, flipping it back to `TODO` — on a page that only shows completed tasks, that
action *is* "restore a completed task." No new Server Action needed.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds. If Next.js's build complains about `useSearchParams` needing a
`Suspense` boundary, wrap `<CompletedFilters />` in `<Suspense fallback={null}>` in this page —
try without it first, since this page is already fully dynamic (it calls `auth()`), which usually
avoids that requirement.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/completed/page.tsx"
git commit -m "Build the /completed page"
```

---

### Task 8: Final verification

- [ ] **Step 1: Automated checks**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: all four succeed with no errors.

- [ ] **Step 2: Manual browser walkthrough**

`npm run dev`, log in as the seeded demo user:

1. Visit `/today` — confirm "Fix homepage header" (due today, per the seed) appears under "Due
   Today" grouped by "Client Website"; confirm "Overdue" and "No Due Date" show their respective
   empty messages if nothing currently qualifies (or real grouped tasks if you've added any due
   dates in the past during earlier testing)
2. Visit `/upcoming` — add a task with a due date a few days out if none currently exist, confirm
   it appears under the correct date heading (e.g. "Tomorrow" or a short date)
3. Visit `/completed` — confirm "Deploy to staging" appears; search for a term that doesn't match
   anything and confirm the list empties with "No completed tasks found."; clear the search and
   filter by "Personal Website" (a project with no completed tasks) and confirm it empties;
   clear filters and confirm "Deploy to staging" reappears
4. On `/completed`, uncheck "Deploy to staging"'s checkbox — confirm it disappears from this page
   (no longer completed), then confirm it now appears back in the Client Website project's To Do
   column — this is the "restore" behavior
5. Revisit `/` (Dashboard) and confirm Today's Tasks still renders exactly as before this phase —
   the refactor in Task 2 should be invisible behaviorally
6. Check the browser console for errors throughout — expect none

- [ ] **Step 3: Clean up test data**

Re-complete "Deploy to staging" (toggle its checkbox again) to restore the seed fixture to its
original state, and delete any test task added in Step 2 for the `/upcoming` check.

- [ ] **Step 4: Update plan status**

Mark all checkboxes in this plan complete once every step above has actually passed.
