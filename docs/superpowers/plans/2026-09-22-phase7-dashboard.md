# Phase 7: Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` placeholder with the real Dashboard — greeting, four stat cards, Today's Tasks (grouped by project, completable inline), Upcoming Tasks preview, Recent Projects, and a calendar widget showing which days have tasks due.

**Architecture:** One Server Component (`page.tsx`) runs all data-fetching in parallel (`Promise.all`), then hands plain data down to small presentational/Client Component pieces. Today's Tasks reuses Phase 3/4's `TaskListItem` unchanged; Recent Projects reuses Phase 2's `ProjectCard` via a newly-extracted shared mapping helper (also adopted by `/projects/page.tsx` to avoid duplicating that logic). The calendar is the one genuinely new Client Component, using shadcn's `calendar` (react-day-picker) with a bounded 90-day data window fetched once.

**Tech Stack:** shadcn `calendar` component (new — pulls in `react-day-picker`), everything else reused from Phases 1–4.

**Design doc:** `docs/superpowers/specs/2026-09-22-phase7-dashboard-design.md`

---

### Task 1: Add the calendar shadcn component

**Files:**
- Create: `src/components/ui/calendar.tsx`

- [x] **Step 1: Add the component**

```bash
npx shadcn@3.8.5 add calendar --yes
```

- [x] **Step 2: Check its actual API**

Open the generated `src/components/ui/calendar.tsx` and confirm the exported `Calendar`
component accepts `mode`, `selected`, `onSelect`, `modifiers`, and `modifiersClassNames` props
(standard react-day-picker single-select props). Task 7 assumes this API — if the generated
component's prop names differ, adapt Task 7's code to match what's actually there.

- [x] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds; `src/components/ui/calendar.tsx` exists.

- [x] **Step 4: Commit**

```bash
git add src/components/ui/calendar.tsx package.json package-lock.json
git commit -m "Add calendar shadcn component"
```

---

### Task 2: Greeting utility (TDD)

**Files:**
- Create: `src/lib/greeting.ts`
- Test: `src/lib/greeting.test.ts`

- [x] **Step 1: Write the failing test**

`src/lib/greeting.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getGreeting } from "./greeting";

describe("getGreeting", () => {
  it("returns a morning greeting for early hours", () => {
    expect(getGreeting(6)).toBe("Good morning");
    expect(getGreeting(11)).toBe("Good morning");
  });

  it("returns an afternoon greeting for midday hours", () => {
    expect(getGreeting(12)).toBe("Good afternoon");
    expect(getGreeting(16)).toBe("Good afternoon");
  });

  it("returns an evening greeting for late hours", () => {
    expect(getGreeting(17)).toBe("Good evening");
    expect(getGreeting(23)).toBe("Good evening");
  });

  it("returns an evening greeting for the early hours after midnight", () => {
    expect(getGreeting(0)).toBe("Good evening");
    expect(getGreeting(4)).toBe("Good evening");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './greeting'`

- [x] **Step 3: Implement**

`src/lib/greeting.ts`:
```ts
export function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}
```

Takes an hour (0–23) rather than a `Date` so it's trivial to test — the caller (Task 8) passes
`new Date().getUTCHours()`, deliberately using UTC rather than the server's local time or the
visitor's, for the same reason `formatDueDate` (Phase 3) does all its day-boundary math in UTC:
this app has no per-user timezone concept anywhere, so UTC is the one consistent reference point.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests)

- [x] **Step 5: Commit**

```bash
git add src/lib/greeting.ts src/lib/greeting.test.ts
git commit -m "Add greeting utility"
```

---

### Task 3: Shared project-card mapping helper (TDD)

**Files:**
- Create: `src/lib/project-card-data.ts`
- Test: `src/lib/project-card-data.test.ts`
- Modify: `src/app/(dashboard)/projects/page.tsx` (adopt the helper)

- [x] **Step 1: Write the failing test**

`src/lib/project-card-data.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toProjectCardData } from "./project-card-data";

describe("toProjectCardData", () => {
  it("maps a project with tasks into card data", () => {
    const result = toProjectCardData({
      id: "p1",
      slug: "client-website",
      name: "Client Website",
      description: "A site",
      color: "#6366f1",
      status: "ACTIVE",
      updatedAt: new Date("2026-09-20T00:00:00.000Z"),
      tasks: [{ status: "COMPLETED" }, { status: "TODO" }],
    });

    expect(result).toEqual({
      id: "p1",
      slug: "client-website",
      name: "Client Website",
      description: "A site",
      color: "#6366f1",
      status: "ACTIVE",
      completedCount: 1,
      totalCount: 2,
      percent: 50,
      updatedAtLabel: expect.any(String),
    });
  });

  it("defaults a null description to an empty string", () => {
    const result = toProjectCardData({
      id: "p2",
      slug: "personal",
      name: "Personal",
      description: null,
      color: "#22c55e",
      status: "ACTIVE",
      updatedAt: new Date(),
      tasks: [],
    });

    expect(result.description).toBe("");
    expect(result.totalCount).toBe(0);
    expect(result.percent).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './project-card-data'`

- [x] **Step 3: Implement**

`src/lib/project-card-data.ts`:
```ts
import { computeProjectProgress } from "./progress";
import { formatRelativeTime } from "./format-relative-time";
import type { ProjectCardData } from "@/components/projects/project-card";
import type { ProjectInput } from "./validations/project";

type ProjectForCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectInput["status"];
  updatedAt: Date;
  tasks: { status: string }[];
};

export function toProjectCardData(project: ProjectForCard): ProjectCardData {
  const { completedCount, totalCount, percent } = computeProjectProgress(
    project.tasks.map((task) => task.status)
  );

  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description ?? "",
    color: project.color as ProjectInput["color"],
    status: project.status,
    completedCount,
    totalCount,
    percent,
    updatedAtLabel: formatRelativeTime(project.updatedAt),
  };
}
```

`ProjectForCard` is a structural type, not `@prisma/client`'s generated `Project` type — this
keeps the function testable with a plain object (no Prisma/database needed in the test above) and
mirrors the same decoupling reasoning as `lib/validations/*.ts`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (2 tests)

- [x] **Step 5: Adopt it in `/projects/page.tsx`**

Replace the full contents of `src/app/(dashboard)/projects/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toProjectCardData } from "@/lib/project-card-data";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { ProjectCard } from "@/components/projects/project-card";

export default async function ProjectsPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { tasks: { select: { status: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="max-w-sm text-muted-foreground">
          Create your first project to start organizing your work.
        </p>
        <NewProjectButton label="Create Project" />
      </div>
    );
  }

  const projectCards = projects.map(toProjectCardData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <NewProjectButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectCards.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 6: Verify**

Run: `npm run build`
Expected: build succeeds, `/projects` unchanged in behavior.

- [x] **Step 7: Commit**

```bash
git add src/lib/project-card-data.ts src/lib/project-card-data.test.ts "src/app/(dashboard)/projects/page.tsx"
git commit -m "Extract shared project-card mapping helper"
```

---

### Task 4: Stat card component

**Files:**
- Create: `src/components/dashboard/stat-card.tsx`

- [x] **Step 1: Implement**

`src/components/dashboard/stat-card.tsx`:
```tsx
export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
```

No `"use client"` needed — purely presentational, renders fine from the Server Component page.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/dashboard/stat-card.tsx
git commit -m "Add dashboard stat card"
```

---

### Task 5: Today's Tasks section

**Files:**
- Create: `src/components/dashboard/today-tasks-section.tsx`

- [x] **Step 1: Implement**

`src/components/dashboard/today-tasks-section.tsx`:
```tsx
import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";

export type TodayTaskGroup = {
  projectId: string;
  projectName: string;
  tasks: TaskListItemData[];
};

export function TodayTasksSection({
  groups,
  projects,
}: {
  groups: TodayTaskGroup[];
  projects: { id: string; name: string }[];
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">You don&apos;t have any tasks due today.</p>
    );
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

No `"use client"` here either — this component itself has no interactivity of its own; it just
renders `TaskListItem` (which is a Client Component) as children, which Next.js's App Router
supports natively.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/dashboard/today-tasks-section.tsx
git commit -m "Add Today's Tasks dashboard section"
```

---

### Task 6: Upcoming task row

**Files:**
- Create: `src/components/dashboard/upcoming-task-row.tsx`

- [x] **Step 1: Implement**

`src/components/dashboard/upcoming-task-row.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDueDate } from "@/lib/format-due-date";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type UpcomingTaskData = {
  id: string;
  title: string;
  projectName: string;
  priority: string;
  dueDate: Date;
};

export function UpcomingTaskRow({ task }: { task: UpcomingTaskData }) {
  const dueDateInfo = formatDueDate(task.dueDate);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
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
      </div>
    </div>
  );
}
```

Deliberately read-only — no checkbox, no click-to-edit. Per the design doc, the spec's field list
for this section (name/project/due date/priority) doesn't ask for inline editing, and reusing the
heavier `TaskListItem` (which embeds a full edit sheet) here would be scope creep for what's meant
to be a quick preview.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/dashboard/upcoming-task-row.tsx
git commit -m "Add upcoming task row"
```

---

### Task 7: Dashboard calendar

**Files:**
- Create: `src/components/dashboard/dashboard-calendar.tsx`

- [x] **Step 1: Implement**

`src/components/dashboard/dashboard-calendar.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { UpcomingTaskRow, type UpcomingTaskData } from "./upcoming-task-row";

// Task due dates are stored as UTC-midnight instants (see lib/format-due-date.ts). The calendar
// widget compares days in the browser's local timezone, so each date's UTC year/month/day is
// re-anchored onto local midnight here — otherwise a task due "Sep 22" could render under Sep 21
// on the calendar for viewers west of UTC.
function toLocalMidnight(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function DashboardCalendar({ tasks }: { tasks: UpcomingTaskData[] }) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const taskDates = useMemo(() => tasks.map((task) => toLocalMidnight(task.dueDate)), [tasks]);

  const tasksOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const selectedTime = toLocalMidnight(selectedDate).getTime();
    return tasks.filter((task) => toLocalMidnight(task.dueDate).getTime() === selectedTime);
  }, [tasks, selectedDate]);

  return (
    <div className="space-y-3">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{ hasTask: taskDates }}
        modifiersClassNames={{ hasTask: "font-bold underline" }}
        className="rounded-lg border"
      />
      {selectedDate ? (
        <div className="space-y-2">
          {tasksOnSelectedDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks due this day.</p>
          ) : (
            tasksOnSelectedDate.map((task) => <UpcomingTaskRow key={task.id} task={task} />)
          )}
        </div>
      ) : null}
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. If `Calendar`'s actual prop names differ from what Task 1 assumed, adjust
here to match — check `src/components/ui/calendar.tsx`'s exports.

- [x] **Step 3: Commit**

```bash
git add src/components/dashboard/dashboard-calendar.tsx
git commit -m "Add dashboard calendar widget"
```

---

### Task 8: Wire up the Dashboard page

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [x] **Step 1: Replace the placeholder**

Replace the full contents of `src/app/(dashboard)/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGreeting } from "@/lib/greeting";
import { toProjectCardData } from "@/lib/project-card-data";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  TodayTasksSection,
  type TodayTaskGroup,
} from "@/components/dashboard/today-tasks-section";
import { UpcomingTaskRow, type UpcomingTaskData } from "@/components/dashboard/upcoming-task-row";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { ProjectCard } from "@/components/projects/project-card";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

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

  const todayTaskItems: TaskListItemData[] = todaysTasksRaw.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  }));

  const todayGroupsMap = new Map<string, TodayTaskGroup>();
  todaysTasksRaw.forEach((task, index) => {
    const item = todayTaskItems[index];
    const existing = todayGroupsMap.get(task.projectId);
    if (existing) {
      existing.tasks.push(item);
    } else {
      todayGroupsMap.set(task.projectId, {
        projectId: task.projectId,
        projectName: task.project.name,
        tasks: [item],
      });
    }
  });
  const todayGroups = Array.from(todayGroupsMap.values());

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
            <TodayTasksSection groups={todayGroups} projects={allProjectsForTaskForm} />
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

- [x] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds; `/` shows real content in the route table (no longer a trivial static
placeholder).

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/page.tsx"
git commit -m "Wire up the Dashboard page"
```

---

### Task 9: Final verification

- [x] **Step 1: Automated checks**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: all four succeed with no errors.

- [x] **Step 2: Manual browser walkthrough**

`npm run dev`, log in as the seeded demo user:

1. Confirm the greeting text matches the current UTC time of day and shows "Jack" (the seeded
   user's name)
2. Confirm the four stat cards show correct numbers: Total Projects = 2, Active Tasks = however
   many seeded tasks aren't `COMPLETED`, Due Today reflecting the seeded "Fix homepage header"
   task (due today per the seed script), Completed This Week reflecting "Deploy to staging"
3. Confirm "Fix homepage header" appears under Today's Tasks, grouped under "Client Website",
   with a working checkbox — toggle it and confirm the Active Tasks/Due Today stat cards update
   without a full reload
4. Confirm Recent Projects shows both seeded projects as real, clickable `ProjectCard`s linking to
   their slugs
5. Confirm the calendar shows a marker on today's date (from the seeded due-today task); click
   that date and confirm the task list beneath the calendar shows it; click a date with no tasks
   and confirm "No tasks due this day."
6. Register a second, fresh user with zero projects — confirm `/` shows sensible empty states
   (zeroed stat cards, "You don't have any tasks due today.", "No upcoming tasks.", "Create your
   first project…") rather than a broken layout
7. Check the browser console for errors throughout — expect none

**Found during this pass:** step 5's click-a-marked-date check failed on a UTC+5 dev machine — a
task genuinely due that day showed "No tasks due this day." The `hasTask` marker itself was
correct (visibly distinct from react-day-picker's own "today" highlight, confirmed by adding a
task due on a different day and screenshotting), but the click filter's `tasksOnSelectedDate`
logic ran `selectedDate` (already local midnight for the clicked day, straight from
react-day-picker) through the same `toLocalMidnight()` re-anchoring meant only for `task.dueDate`
(a UTC-stored instant) — double-converting it shifted the comparison by the browser's UTC offset.
Fixed by comparing `selectedDate` directly, only re-anchoring the task dates. Re-verified clean
after the fix: the marked date's task appeared, an unmarked date correctly showed the empty
message, and the fix passed lint/tsc/test/build again.

- [x] **Step 3: Clean up test data**

Delete the second test user created in Step 2 via `npx prisma studio` or a one-off script.

- [x] **Step 4: Update plan status**

Mark all checkboxes in this plan complete once every step above has actually passed.
