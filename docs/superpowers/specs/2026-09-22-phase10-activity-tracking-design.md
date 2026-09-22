# Phase 10: Activity Tracking — Design

## Goal

Log a lightweight, useful activity trail for exactly the four event types the spec names
("Task created", "Task completed", "Task priority changed", "Project created"), and surface it
in two places: a per-project feed on the Project Detail page, and a cross-project "Recent
Activity" widget on the Dashboard. The `Activity` model already exists in `prisma/schema.prisma`
(added during Phase 1 setup) but nothing writes to or reads from it yet — this phase wires it up
end to end.

Per the spec's explicit guardrail ("Only track useful activity. Do not build a complicated
enterprise audit system."), scope is deliberately narrow: exactly these 4 event types, no
deletion tracking, no generic field-level diffing.

## 1. Logging (write side)

### `src/actions/activity.ts`

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

This is an internal helper — it's only ever called from other Server Actions (`actions/tasks.ts`,
`actions/projects.ts`), never invoked directly from a Client Component. It does not re-check
authentication itself; callers already have a verified `userId` in hand from their own
`requireUserId()` call.

### Metadata shape (denormalized, not joined)

Both `Activity.projectId` → `Project` and `Activity.taskId` → `Task` are already `onDelete:
Cascade` in the schema. If activity rows relied on a live join to read a task's title or a
project's name at render time, deleting that task/project would silently erase the activity
text along with it — the opposite of what a log is for. Instead, the human-readable fields are
snapshotted into the `metadata` JSON column at write time:

- `PROJECT_CREATED`: `{ name: string }`
- `TASK_CREATED`: `{ title: string, projectName: string }`
- `TASK_COMPLETED`: `{ title: string, projectName: string }`
- `TASK_PRIORITY_CHANGED`: `{ title: string, projectName: string, from: TaskPriority, to: TaskPriority }`

(The `projectId`/`taskId` foreign keys are still set alongside the metadata, so a feed can still
be scoped with a plain `where: { projectId }` — only the *text* is denormalized, not the
relations used for filtering.)

### Call sites

- **`createProject`** (`src/actions/projects.ts`): after `prisma.project.create(...)` succeeds,
  call `logActivity({ userId, projectId: project.id, type: "PROJECT_CREATED", metadata: { name: project.name } })`.
- **`createTask`** (`src/actions/tasks.ts`): after `prisma.task.create(...)` succeeds, call
  `logActivity({ userId, projectId: task.projectId, taskId: task.id, type: "TASK_CREATED", metadata: { title: task.title, projectName } })`.
  (`createTask` doesn't currently fetch the project's name — it only checks the project exists by
  id. The existence check's `select` gains a `name` field so this is available with no extra
  query.)
- **`updateTaskStatus`** (`src/actions/tasks.ts`): this action already fetches the task before
  updating (currently `select: { projectId: true }`, to scope `revalidatePath`). That `select`
  widens to also pull `status`, `title`, and `project: { select: { name: true } }`. After the
  update, if the *previous* status was not `COMPLETED` and the *new* status is `COMPLETED`, log
  `TASK_COMPLETED`. A task that's already completed and gets set to `COMPLETED` again (not
  reachable through normal UI, but defensively) does not re-log.
- **`updateTask`** (`src/actions/tasks.ts`, the full edit-sheet save): currently goes straight to
  `updateMany` with no prior fetch. Add a `findFirst` fetch of the task's current `status`,
  `priority`, and `project: { select: { name: true } }` *before* the update (scoped by
  `{ id: taskId, userId }`, consistent with every other ownership check in this file). After the
  update succeeds, compare old vs. new:
  - If priority differs, log `TASK_PRIORITY_CHANGED` with `from`/`to`.
  - If status transitioned into `COMPLETED` from something else, log `TASK_COMPLETED` — this
    covers completing a task via the edit sheet's Status dropdown, not just the Kanban checkbox.
  - Both can fire from a single save (e.g. the user changes priority and marks it complete in the
    same edit).
- **No other action logs anything** — `deleteTask`, `deleteProject`, `updateProject`,
  `archiveProject` are explicitly out of scope per the "exactly these 4" decision.

## 2. Rendering (read side)

### `src/lib/format-activity-message.ts` (pure function, unit tested)

```ts
export type ActivityMessageInput = {
  type: "PROJECT_CREATED" | "TASK_CREATED" | "TASK_COMPLETED" | "TASK_PRIORITY_CHANGED";
  metadata: Record<string, unknown>;
};

export function formatActivityMessage(activity: ActivityMessageInput): string {
  const metadata = activity.metadata;
  switch (activity.type) {
    case "PROJECT_CREATED":
      return `Created project "${metadata.name}"`;
    case "TASK_CREATED":
      return `Created task "${metadata.title}"`;
    case "TASK_COMPLETED":
      return `Completed "${metadata.title}"`;
    case "TASK_PRIORITY_CHANGED":
      return `Changed "${metadata.title}" priority from ${metadata.from} to ${metadata.to}`;
  }
}
```

(Exact TypeScript narrowing of `metadata`'s fields per branch is filled in during implementation
— the shapes are already pinned down above, this is just property access.)

### `ActivityFeed` component

A small Server-renderable component (no "use client" needed — it has no interactivity) that
takes already-fetched, already-formatted rows and renders them:

```ts
type ActivityFeedItem = { id: string; message: string; createdAt: Date };
```

Each row: the formatted message, plus `formatRelativeTime(createdAt)` (the existing helper,
already used elsewhere for "Updated 2 hours ago" on `ProjectCard`). Empty state: "No activity
yet."

## 3. Placement

- **Project Detail page** (`src/app/(dashboard)/projects/[slug]/page.tsx`): a new "Activity"
  section below the Kanban board (or below the empty-state message, if the project has no
  tasks), querying `prisma.activity.findMany({ where: { projectId: project.id, userId },
  orderBy: { createdAt: "desc" }, take: 10 })`.
- **Dashboard** (`src/app/(dashboard)/page.tsx`): a new "Recent Activity" section in the existing
  right-hand column, below the `Calendar` widget, querying `prisma.activity.findMany({ where: {
  userId }, orderBy: { createdAt: "desc" }, take: 5 })` — across all of the user's projects, no
  `projectId` filter.
- Both call sites map their raw `Activity` rows to `ActivityFeedItem[]` via
  `formatActivityMessage` before rendering `<ActivityFeed items={...} />`.

## 4. Testing

- `formatActivityMessage` is a pure function → TDD unit test covering all 4 branches.
- The Server Action wiring (four call sites) and both feed placements are verified manually in
  the browser: create a project, create a task, complete a task via the checkbox, complete a task
  via the edit sheet, change a task's priority, and confirm each produces exactly the expected
  activity line in both the Project Detail feed and the Dashboard widget — consistent with this
  project's established "unit tests for logic only" approach.

## Files touched

- Create: `src/actions/activity.ts`
- Create: `src/lib/format-activity-message.ts`
- Create: `src/lib/format-activity-message.test.ts`
- Create: `src/components/activity/activity-feed.tsx`
- Modify: `src/actions/projects.ts` (`createProject` logs `PROJECT_CREATED`)
- Modify: `src/actions/tasks.ts` (`createTask`, `updateTaskStatus`, `updateTask` gain logging)
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx` (render project-scoped `ActivityFeed`)
- Modify: `src/app/(dashboard)/page.tsx` (render cross-project `ActivityFeed` in the right column)
