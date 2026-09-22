# Phase 10: Activity Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log exactly 4 activity event types (project created, task created, task completed, task priority changed) from existing Server Actions, and surface them as a per-project feed on the Project Detail page and a cross-project "Recent Activity" widget on the Dashboard.

**Architecture:** A single `logActivity` helper (`actions/activity.ts`) writes rows with denormalized (snapshotted) text in `metadata`, called from four existing mutation call sites in `actions/tasks.ts`/`actions/projects.ts`. A pure `formatActivityMessage` function turns a row's `type`+`metadata` into a display string, and a small `ActivityFeed` component renders a list of already-formatted rows plus `formatRelativeTime`. Both pages that display activity fetch their own scoped rows and map them locally before rendering — no shared cross-page mapping helper, matching how `today/page.tsx` and `upcoming/page.tsx` already do their own local row-mapping.

**Tech Stack:** No new dependencies — everything reused from Phases 1–9. Uses the existing `Activity` Prisma model (already in `prisma/schema.prisma`, unused until now).

**Design doc:** `docs/superpowers/specs/2026-09-22-phase10-activity-tracking-design.md`

---

### Task 1: `formatActivityMessage` helper (TDD)

**Files:**
- Create: `src/lib/format-activity-message.ts`
- Test: `src/lib/format-activity-message.test.ts`

- [x] **Step 1: Write the failing test**

`src/lib/format-activity-message.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatActivityMessage } from "./format-activity-message";

describe("formatActivityMessage", () => {
  it("formats a project created event", () => {
    expect(
      formatActivityMessage({ type: "PROJECT_CREATED", metadata: { name: "Client Website" } })
    ).toBe('Created project "Client Website"');
  });

  it("formats a task created event", () => {
    expect(
      formatActivityMessage({
        type: "TASK_CREATED",
        metadata: { title: "Fix homepage header", projectName: "Client Website" },
      })
    ).toBe('Created task "Fix homepage header"');
  });

  it("formats a task completed event", () => {
    expect(
      formatActivityMessage({
        type: "TASK_COMPLETED",
        metadata: { title: "Fix homepage header", projectName: "Client Website" },
      })
    ).toBe('Completed "Fix homepage header"');
  });

  it("formats a task priority changed event with human-readable priority labels", () => {
    expect(
      formatActivityMessage({
        type: "TASK_PRIORITY_CHANGED",
        metadata: {
          title: "Fix homepage header",
          projectName: "Client Website",
          from: "MEDIUM",
          to: "HIGH",
        },
      })
    ).toBe('Changed "Fix homepage header" priority from Medium to High');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './format-activity-message'`

- [x] **Step 3: Implement**

`src/lib/format-activity-message.ts`:
```ts
const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type ActivityMessageInput =
  | { type: "PROJECT_CREATED"; metadata: { name: string } }
  | { type: "TASK_CREATED"; metadata: { title: string; projectName: string } }
  | { type: "TASK_COMPLETED"; metadata: { title: string; projectName: string } }
  | {
      type: "TASK_PRIORITY_CHANGED";
      metadata: { title: string; projectName: string; from: string; to: string };
    };

export function formatActivityMessage(activity: ActivityMessageInput): string {
  switch (activity.type) {
    case "PROJECT_CREATED":
      return `Created project "${activity.metadata.name}"`;
    case "TASK_CREATED":
      return `Created task "${activity.metadata.title}"`;
    case "TASK_COMPLETED":
      return `Completed "${activity.metadata.title}"`;
    case "TASK_PRIORITY_CHANGED": {
      const from = PRIORITY_LABELS[activity.metadata.from] ?? activity.metadata.from;
      const to = PRIORITY_LABELS[activity.metadata.to] ?? activity.metadata.to;
      return `Changed "${activity.metadata.title}" priority from ${from} to ${to}`;
    }
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests)

- [x] **Step 5: Commit**

```bash
git add src/lib/format-activity-message.ts src/lib/format-activity-message.test.ts
git commit -m "Add formatActivityMessage helper"
```

---

### Task 2: `logActivity` server action helper

**Files:**
- Create: `src/actions/activity.ts`

- [x] **Step 1: Implement**

`src/actions/activity.ts`:
```ts
"use server";

import { prisma } from "@/lib/db";

export type ActivityType =
  | "PROJECT_CREATED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "TASK_PRIORITY_CHANGED";

type LogActivityInput = {
  userId: string;
  projectId?: string;
  taskId?: string;
  type: ActivityType;
  metadata: Record<string, unknown>;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  await prisma.activity.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      taskId: input.taskId,
      type: input.type,
      metadata: input.metadata,
    },
  });
}
```

This is an internal helper called only from other Server Actions (never from a Client Component)
— it trusts the `userId` its caller already verified via their own `requireUserId()`.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/actions/activity.ts
git commit -m "Add logActivity server action helper"
```

---

### Task 3: `ActivityFeed` component

**Files:**
- Create: `src/components/activity/activity-feed.tsx`

- [x] **Step 1: Implement**

`src/components/activity/activity-feed.tsx`:
```tsx
import { formatRelativeTime } from "@/lib/format-relative-time";

export type ActivityFeedItem = {
  id: string;
  message: string;
  createdAt: Date;
};

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
          <span>{item.message}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

No `"use client"` — this component has no interactivity, so it stays a Server Component like the
rest of this project's read-only display components.

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/activity/activity-feed.tsx
git commit -m "Add ActivityFeed component"
```

---

### Task 4: Log `PROJECT_CREATED` from `createProject`

**Files:**
- Modify: `src/actions/projects.ts`

- [x] **Step 1: Implement**

In `src/actions/projects.ts`, add the import and update `createProject` to capture the created
row and log it:

```ts
import { logActivity } from "./activity";
```

```ts
export async function createProject(input: ProjectInput): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  const baseSlug = slugify(parsed.data.name);
  const existingProjects = await prisma.project.findMany({
    where: { userId, slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = ensureUniqueSlug(
    baseSlug,
    existingProjects.map((project) => project.slug)
  );

  const project = await prisma.project.create({
    data: {
      userId,
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      status: parsed.data.status as ProjectStatus,
    },
  });

  await logActivity({
    userId,
    projectId: project.id,
    type: "PROJECT_CREATED",
    metadata: { name: project.name },
  });

  revalidatePath("/projects");
  return { success: true };
}
```

(Only the `await prisma.project.create(...)` line and everything after it changes — it now
captures its result as `project` instead of discarding it, and the `logActivity` call is new.
`updateProject`, `archiveProject`, and `deleteProject` are unchanged.)

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/actions/projects.ts
git commit -m "Log PROJECT_CREATED activity from createProject"
```

---

### Task 5: Log `TASK_CREATED` from `createTask`

**Files:**
- Modify: `src/actions/tasks.ts`

- [x] **Step 1: Implement**

In `src/actions/tasks.ts`, add the import and update `createTask`:

```ts
import { logActivity } from "./activity";
```

```ts
export async function createTask(input: TaskInput): Promise<TaskActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  // projectId is user-submitted (a <select> value) — unlike a task's own id, it must be checked
  // against this user's projects before we attach a task to it.
  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId },
    select: { id: true, name: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const task = await prisma.task.create({ data: toTaskData(userId, parsed.data) });

  await logActivity({
    userId,
    projectId: task.projectId,
    taskId: task.id,
    type: "TASK_CREATED",
    metadata: { title: task.title, projectName: project.name },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}
```

(Changes: the project existence check's `select` gains `name`; `prisma.task.create(...)`'s result
is now captured as `task`; the `logActivity` call is new.)

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/actions/tasks.ts
git commit -m "Log TASK_CREATED activity from createTask"
```

---

### Task 6: Log `TASK_COMPLETED` from `updateTaskStatus`

**Files:**
- Modify: `src/actions/tasks.ts`

- [x] **Step 1: Implement**

Update `updateTaskStatus` in `src/actions/tasks.ts`:

```ts
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { projectId: true, status: true, title: true, project: { select: { name: true } } },
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  if (status === "COMPLETED" && task.status !== "COMPLETED") {
    await logActivity({
      userId,
      projectId: task.projectId,
      taskId,
      type: "TASK_COMPLETED",
      metadata: { title: task.title, projectName: task.project.name },
    });
  }

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}
```

(The initial fetch's `select` widens from `{ projectId: true }` to also pull `status`, `title`,
and the project's `name`; the logging happens only on a genuine not-already-completed →
completed transition, after the update succeeds.)

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/actions/tasks.ts
git commit -m "Log TASK_COMPLETED activity from updateTaskStatus"
```

---

### Task 7: Log `TASK_COMPLETED` / `TASK_PRIORITY_CHANGED` from `updateTask`

**Files:**
- Modify: `src/actions/tasks.ts`

- [x] **Step 1: Implement**

Update `updateTask` in `src/actions/tasks.ts`:

```ts
export async function updateTask(taskId: string, input: TaskInput): Promise<TaskActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId },
    select: { id: true, name: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { status: true, priority: true },
  });
  if (!existingTask) {
    return { success: false, error: "Task not found" };
  }

  const result = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: toTaskData(userId, parsed.data),
  });

  if (result.count === 0) {
    return { success: false, error: "Task not found" };
  }

  const newPriority = parsed.data.priority as TaskPriority;
  const newStatus = parsed.data.status as TaskStatus;

  if (newPriority !== existingTask.priority) {
    await logActivity({
      userId,
      projectId: parsed.data.projectId,
      taskId,
      type: "TASK_PRIORITY_CHANGED",
      metadata: {
        title: parsed.data.title,
        projectName: project.name,
        from: existingTask.priority,
        to: newPriority,
      },
    });
  }

  if (newStatus === "COMPLETED" && existingTask.status !== "COMPLETED") {
    await logActivity({
      userId,
      projectId: parsed.data.projectId,
      taskId,
      type: "TASK_COMPLETED",
      metadata: { title: parsed.data.title, projectName: project.name },
    });
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}
```

Notes on this diff:
- The project existence check's `select` gains `name` (used for both activity types' metadata —
  it's the *current/new* project, which matters if the edit sheet is used to move the task to a
  different project: the logged event should describe where the task ends up, not where it was).
- A new `existingTask` fetch runs before the update, to capture the pre-update `status`/`priority`
  for comparison. It's scoped by `{ id: taskId, userId }`, matching this file's existing
  ownership-check convention, and its early `if (!existingTask)` return is reachable in the same
  case the old code already handled via `result.count === 0` (wrong user or missing task) — that
  later check still stays in place unchanged as a defense-in-depth guard.
- Both activity types can fire from a single save (e.g. changing priority and marking complete in
  the same edit).

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/actions/tasks.ts
git commit -m "Log TASK_PRIORITY_CHANGED and TASK_COMPLETED activity from updateTask"
```

---

### Task 8: Render the Activity feed on the Project Detail page

**Files:**
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx`

- [x] **Step 1: Implement**

Add the imports:
```ts
import { ActivityFeed, type ActivityFeedItem } from "@/components/activity/activity-feed";
import { formatActivityMessage, type ActivityMessageInput } from "@/lib/format-activity-message";
```

Add a third parallel query alongside the existing `allProjects`/`allProjectTaskStatuses` fetch,
changing:
```ts
const [allProjects, allProjectTaskStatuses] = await Promise.all([
```
to:
```ts
const [allProjects, allProjectTaskStatuses, activityRows] = await Promise.all([
```
and adding this third query to the array (after the existing two):
```ts
  prisma.activity.findMany({
    where: { projectId: project.id, userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  }),
```

After the existing `taskItems`/`hasActiveFilters` computation, add:
```ts
const activityItems: ActivityFeedItem[] = activityRows.map((row) => ({
  id: row.id,
  message: formatActivityMessage({
    type: row.type,
    metadata: row.metadata,
  } as unknown as ActivityMessageInput),
  createdAt: row.createdAt,
}));
```

Finally, add a new section at the end of the returned JSX, after the closing of the
`{totalCount === 0 ? ... : ...}` block and before the final `</div>`:
```tsx
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Activity</h2>
        <ActivityFeed items={activityItems} />
      </section>
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/projects/[slug]/page.tsx"
git commit -m "Show project activity feed on Project Detail page"
```

---

### Task 9: Render the Recent Activity widget on the Dashboard

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [x] **Step 1: Implement**

Add the imports:
```ts
import { ActivityFeed, type ActivityFeedItem } from "@/components/activity/activity-feed";
import { formatActivityMessage, type ActivityMessageInput } from "@/lib/format-activity-message";
```

Add a new query to the existing `Promise.all` array (after `allProjectsForTaskForm`):
```ts
    prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
```
and add the corresponding destructured name (`recentActivityRaw`) to the array on the left of
that `Promise.all`, in the same position.

After the existing `recentProjects` computation, add:
```ts
  const recentActivityItems: ActivityFeedItem[] = recentActivityRaw.map((row) => ({
    id: row.id,
    message: formatActivityMessage({
      type: row.type,
      metadata: row.metadata,
    } as unknown as ActivityMessageInput),
    createdAt: row.createdAt,
  }));
```

Finally, restructure the right-hand grid column so it can hold two sections instead of one.
Replace:
```tsx
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Calendar</h2>
          <DashboardCalendar tasks={windowTaskItems} />
        </section>
```
with:
```tsx
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Calendar</h2>
            <DashboardCalendar tasks={windowTaskItems} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <ActivityFeed items={recentActivityItems} />
          </section>
        </div>
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/page.tsx"
git commit -m "Show Recent Activity widget on Dashboard"
```

---

### Task 10: Final verification

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

Start the dev server (`npm run dev`) and, logged in as `demo@example.com` / `password123`:

1. Navigate to the Client Website project page — confirm an "Activity" section renders below the
   Kanban board. It should already show history from this project's seed data creation, if any
   rows exist (seeding predates this phase, so it may show "No activity yet." — that's expected
   and fine).
2. Click "Add Task", create a new task (e.g. title "Activity test task", any project/priority/due
   date), save. Revisit the project page — confirm a new "Created task "Activity test task""
   entry appears at the top of the Activity feed with a "just now" / "X minute(s) ago" timestamp.
3. Check the checkbox on "Activity test task" to complete it. Confirm a new "Completed "Activity
   test task"" entry appears.
4. Uncheck it again (restore to To Do), then open its edit sheet, change its priority (e.g. Low →
   High), and save. Confirm a new "Changed "Activity test task" priority from Low to High" entry
   appears. Confirm unchecking it earlier did NOT produce any activity entry (only completions are
   logged, not un-completions).
5. In the same edit sheet, set Status to "Completed" directly (instead of the checkbox) and save.
   Confirm a "Completed "Activity test task"" entry appears again (a second completion, since it
   had been reset to To Do in step 4).
6. Navigate to the Dashboard — confirm the new "Recent Activity" section appears in the right
   column, below the Calendar, and includes the same recent events (up to 5, across all
   projects).
7. Create a brand-new project (e.g. "Activity Test Project"). Confirm a "Created project "Activity
   Test Project"" entry appears on the Dashboard's Recent Activity widget.
8. Check the browser console for errors throughout — expect none.

- [x] **Step 3: Clean up test data**

Delete "Activity test task" (via its edit sheet's Delete button) and delete "Activity Test
Project" (via its project card's actions menu), so the seed data returns to its Phase 8/9
verification state. Note: deleting them will also cascade-delete their own activity rows (by
design, per the spec's cascade-delete discussion) — this is expected and fine.

- [x] **Step 4: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-22-phase10-activity-tracking.md
```

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-phase10-activity-tracking.md
git commit -m "Mark Phase 10 plan complete after manual verification"
```
