# Phase 3: Tasks CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/projects/[id]` page where the user can see a project's tasks, quickly add one (title-only required), edit full details, toggle complete with one click, and delete — all scoped to the authenticated user. No Kanban columns or drag-and-drop yet (Phase 5).

**Architecture:** Same shape as Phase 2's Projects CRUD: a Server Component page fetches data directly via Prisma (ownership-scoped, `notFound()` if the project isn't the current user's), and small Client Component islands (`AddTaskButton`, `TaskListItem`, the shared `TaskFormSheet`) handle interactivity. Mutations go through `actions/tasks.ts` Server Actions scoped by `{ id, userId }`, with an extra check on `createTask`/`updateTask` that the target `projectId` also belongs to the current user (since that's user-submitted input, unlike the task's own `id`).

**Tech Stack:** Next.js 15 Server Components + Server Actions, Prisma 5, Zod, React Hook Form, shadcn/ui (`checkbox` — new; reuses `sheet`, `form`, `button`, `input`, `textarea`, `select`, `alert-dialog`, `badge`, `dropdown-menu` from Phases 1–2), Vitest for the pure-logic units.

**Design doc:** `docs/superpowers/specs/2026-09-21-phase3-tasks-crud-design.md`

---

### Task 1: Add the checkbox shadcn component

**Files:**
- Create: `src/components/ui/checkbox.tsx`

- [ ] **Step 1: Add the component**

```bash
npx shadcn@3.8.5 add checkbox --yes
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds; `src/components/ui/checkbox.tsx` exists.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/checkbox.tsx package.json package-lock.json
git commit -m "Add checkbox shadcn component"
```

---

### Task 2: Task validation schema (TDD)

**Files:**
- Create: `src/lib/validations/task.ts`
- Test: `src/lib/validations/task.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/validations/task.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { taskSchema } from "./task";

describe("taskSchema", () => {
  const validBase = {
    title: "Fix homepage header",
    projectId: "project_123",
    priority: "MEDIUM" as const,
    status: "TODO" as const,
  };

  it("accepts a minimal valid payload", () => {
    const result = taskSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields when provided", () => {
    const result = taskSchema.safeParse({
      ...validBase,
      description: "Some description",
      notes: "Some notes",
      dueDate: "2026-09-25",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = taskSchema.safeParse({ ...validBase, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = taskSchema.safeParse({ ...validBase, title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a missing projectId", () => {
    const result = taskSchema.safeParse({ ...validBase, projectId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    const result = taskSchema.safeParse({ ...validBase, priority: "SUPER_URGENT" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = taskSchema.safeParse({ ...validBase, status: "DONE" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './task'`

- [ ] **Step 3: Implement**

`src/lib/validations/task.ts`:
```ts
import { z } from "zod";

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes must be 2000 characters or fewer")
    .optional()
    .or(z.literal("")),
  projectId: z.string().min(1, "Project is required"),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  dueDate: z.string().optional().or(z.literal("")),
});

export type TaskInput = z.infer<typeof taskSchema>;
```

Same decoupling rationale as `lib/validations/project.ts` in Phase 2: `priority`/`status` are our
own string-literal unions, not imported from `@prisma/client`, since this file is imported by
client components. `dueDate` is a plain string (the value an `<input type="date">` produces, e.g.
`"2026-09-25"`, or `""` for none) — converted to a `Date | null` only in `actions/tasks.ts`
(server-only).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/task.ts src/lib/validations/task.test.ts
git commit -m "Add task validation schema"
```

---

### Task 3: Due date formatting (TDD)

**Files:**
- Create: `src/lib/format-due-date.ts`
- Test: `src/lib/format-due-date.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/format-due-date.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatDueDate } from "./format-due-date";

describe("formatDueDate", () => {
  const now = new Date("2026-09-21T15:00:00.000Z");

  it("returns no label when there is no due date", () => {
    expect(formatDueDate(null, now)).toEqual({ label: null, variant: "none" });
  });

  it("labels a date earlier today as Today", () => {
    const due = new Date("2026-09-21T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Today", variant: "today" });
  });

  it("labels yesterday as Overdue", () => {
    const due = new Date("2026-09-20T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Overdue", variant: "overdue" });
  });

  it("labels tomorrow as Tomorrow", () => {
    const due = new Date("2026-09-22T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Tomorrow", variant: "upcoming" });
  });

  it("labels a date further out with a short date", () => {
    const due = new Date("2026-09-26T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Sep 26", variant: "upcoming" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './format-due-date'`

- [ ] **Step 3: Implement**

`src/lib/format-due-date.ts`:
```ts
export type DueDateVariant = "overdue" | "today" | "upcoming" | "none";

export type DueDateInfo = {
  label: string | null;
  variant: DueDateVariant;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatDueDate(dueDate: Date | null, now: Date = new Date()): DueDateInfo {
  if (!dueDate) {
    return { label: null, variant: "none" };
  }

  const diffDays = Math.round(
    (startOfUtcDay(dueDate) - startOfUtcDay(now)) / (24 * 60 * 60 * 1000)
  );

  if (diffDays < 0) {
    return { label: "Overdue", variant: "overdue" };
  }
  if (diffDays === 0) {
    return { label: "Today", variant: "today" };
  }
  if (diffDays === 1) {
    return { label: "Tomorrow", variant: "upcoming" };
  }
  return {
    label: dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    variant: "upcoming",
  };
}
```

Day-boundary comparisons use UTC consistently (`startOfUtcDay` for the diff, `timeZone: "UTC"` for
the fallback label) because due dates are stored as UTC-midnight instants — an `<input
type="date">` value like `"2026-09-25"` parses via `new Date("2026-09-25")` as UTC midnight per the
date-only form of the ECMAScript `Date` spec. Comparing in the server's local timezone instead
could shift a date across a day boundary near midnight and mislabel it.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/format-due-date.ts src/lib/format-due-date.test.ts
git commit -m "Add due date formatting"
```

---

### Task 4: Task Server Actions

**Files:**
- Create: `src/actions/tasks.ts`

- [ ] **Step 1: Implement**

`src/actions/tasks.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { taskSchema, type TaskInput } from "@/lib/validations/task";

export type TaskActionResult = { success: true } | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

function toTaskData(userId: string, input: TaskInput) {
  return {
    userId,
    projectId: input.projectId,
    title: input.title,
    description: input.description || null,
    notes: input.notes || null,
    priority: input.priority as TaskPriority,
    status: input.status as TaskStatus,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  };
}

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
    select: { id: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  await prisma.task.create({ data: toTaskData(userId, parsed.data) });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function updateTask(taskId: string, input: TaskInput): Promise<TaskActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId },
    select: { id: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const result = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: toTaskData(userId, parsed.data),
  });

  if (result.count === 0) {
    return { success: false, error: "Task not found" };
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { projectId: true },
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

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { projectId: true },
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await prisma.task.deleteMany({ where: { id: taskId, userId } });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}
```

`updateTaskStatus`/`deleteTask` look up the task first (scoped by `{ id, userId }`) both to return
an early "not found" without attempting a doomed write, and to get `projectId` for revalidation —
then the actual mutation is *also* scoped by `{ id, userId }` via `updateMany`/`deleteMany`, so the
real enforcement never depends on the earlier read. Same reasoning as Phase 2's project actions.

No unit test for this file, same reasoning as `actions/projects.ts` in Phase 2 — it's a thin
Prisma/Auth.js wrapper over the already-tested validation schema; verified by the manual browser
pass in Task 11.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/tasks.ts
git commit -m "Add task Server Actions"
```

---

### Task 5: Delete task confirmation dialog

**Files:**
- Create: `src/components/tasks/delete-task-dialog.tsx`

- [ ] **Step 1: Implement**

`src/components/tasks/delete-task-dialog.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteTask } from "@/actions/tasks";

type DeleteTaskDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  onDeleted: () => void;
};

export function DeleteTaskDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  onDeleted,
}: DeleteTaskDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteTask(taskId);
    setIsDeleting(false);
    if (result.success) {
      toast.success("Task deleted");
      onOpenChange(false);
      onDeleted();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{taskTitle}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the task. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`onDeleted` is a separate callback from `onOpenChange` because this dialog is nested inside
`TaskFormSheet` (Task 6) — a successful delete needs to close *both* the confirmation dialog and
the parent edit sheet, and the dialog itself has no reference to the sheet's own open state.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/delete-task-dialog.tsx
git commit -m "Add delete task confirmation dialog"
```

---

### Task 6: Shared create/edit task sheet

**Files:**
- Create: `src/components/tasks/task-form-sheet.tsx`

- [ ] **Step 1: Implement**

`src/components/tasks/task-form-sheet.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  taskSchema,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskInput,
} from "@/lib/validations/task";
import { createTask, updateTask } from "@/actions/tasks";
import { DeleteTaskDialog } from "./delete-task-dialog";

const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

type TaskFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[];
  defaultProjectId: string;
  task?: { id: string } & TaskInput;
};

export function TaskFormSheet({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  task,
}: TaskFormSheetProps) {
  const isEdit = !!task;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const emptyValues: TaskInput = {
    title: "",
    description: "",
    notes: "",
    projectId: defaultProjectId,
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
  };

  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: task ?? emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(task ?? emptyValues);
    }
  }, [open, task, form]);

  async function onSubmit(values: TaskInput) {
    const result = task ? await updateTask(task.id, values) : await createTask(values);

    if (result.success) {
      toast.success(isEdit ? "Task updated" : "Task created");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Task" : "Add Task"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Fix homepage header" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What needs to happen?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SheetFooter className="flex-row px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add task"}
              </Button>
              {task ? (
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              ) : null}
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
        {task ? (
          <DeleteTaskDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            taskId={task.id}
            taskTitle={task.title}
            onDeleted={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
```

All fields (including `status`) are always shown, even for a brand-new task defaulting to `TODO`
— same reasoning as Phase 2's project status/color fields: visible-but-defaulted is simpler and
avoids depending on React Hook Form's unregistered-field-still-submits-its-defaultValue behavior
for a conditionally-hidden field.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/task-form-sheet.tsx
git commit -m "Add shared create/edit task sheet"
```

---

### Task 7: Add Task button

**Files:**
- Create: `src/components/tasks/add-task-button.tsx`

- [ ] **Step 1: Implement**

`src/components/tasks/add-task-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormSheet } from "./task-form-sheet";

export function AddTaskButton({
  projects,
  defaultProjectId,
  label = "Add Task",
}: {
  projects: { id: string; name: string }[];
  defaultProjectId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <TaskFormSheet
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        defaultProjectId={defaultProjectId}
      />
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/add-task-button.tsx
git commit -m "Add Add Task button"
```

---

### Task 8: Edit Project button

**Files:**
- Create: `src/components/projects/edit-project-button.tsx`

This lives alongside the other project components (not `components/tasks/`) since it wraps
`ProjectFormSheet` — it's needed now for the project detail page's header, reusing Phase 2's sheet
exactly as the design doc calls for.

- [ ] **Step 1: Implement**

`src/components/projects/edit-project-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormSheet } from "./project-form-sheet";
import type { ProjectInput } from "@/lib/validations/project";

export function EditProjectButton({ project }: { project: { id: string } & ProjectInput }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Edit Project
      </Button>
      <ProjectFormSheet open={open} onOpenChange={setOpen} project={project} />
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/edit-project-button.tsx
git commit -m "Add Edit Project button for the project detail page"
```

---

### Task 9: Task list item

**Files:**
- Create: `src/components/tasks/task-list-item.tsx`

- [ ] **Step 1: Implement**

`src/components/tasks/task-list-item.tsx`:
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
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
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
      {dueDateInfo.label ? (
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
      ) : null}

      <TaskFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        projects={projects}
        defaultProjectId={task.projectId}
        task={task}
      />
    </div>
  );
}
```

`useTransition` wraps the checkbox toggle so it doesn't block the UI while the Server Action runs,
and `isPending` disables the checkbox to prevent a double-click race.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/tasks/task-list-item.tsx
git commit -m "Add task list item"
```

---

### Task 10: Wire up the project detail page

**Files:**
- Create: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Implement**

`src/app/(dashboard)/projects/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { AddTaskButton } from "@/components/tasks/add-task-button";
import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";
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

`params` is a `Promise` here — Next.js 15 made dynamic route params async. `notFound()` is typed
to return `never`, so TypeScript narrows `project` to non-null for the rest of the function without
an extra assertion. The task ordering (`status asc, priority desc, dueDate asc`) sinks completed
tasks to the bottom and surfaces urgent/soon-due work first — Postgres (and Prisma) sort native
enums by their declared order, and both `TaskStatus` and `TaskPriority` were declared in exactly
this ascending order in the Phase 1 schema, so no raw SQL or custom sort key is needed.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds; `/projects/[id]` listed in the route table as a dynamic route.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/projects/[id]/page.tsx"
git commit -m "Wire up the project detail page with real tasks"
```

---

### Task 11: Final verification

- [ ] **Step 1: Automated checks**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: all four succeed with no errors.

- [ ] **Step 2: Manual browser walkthrough**

`npm run dev`, log in as the seeded demo user (`demo@example.com` / `password123`), then in a
real browser:

1. From `/projects`, click into "Client Website" → confirm its 4 seeded tasks render, correctly
   sorted (incomplete before completed), with correct priority badges and due-date chips
2. Click "Add Task", fill in only the title, submit → new task appears immediately in the list
   with no full page reload, defaulted to this project/Medium priority/To Do
3. Click an existing task → edit its title, priority, due date, and notes → save → confirm the
   row updates immediately
4. Toggle a task's checkbox → confirm it visually marks complete (strikethrough) and the header
   progress bar/count updates without a full reload; toggle it back and confirm it un-completes
5. Open a task → click Delete → confirm the AlertDialog blocks accidental deletion (Cancel, verify
   task still there), then confirm again and Delete → task disappears and the sheet also closes
6. Set a task's due date to today's date and confirm its chip reads "Today"; set one to yesterday
   and confirm "Overdue"
7. Click "Edit Project" in the header → confirm Phase 2's project sheet opens pre-filled and still
   works from this page
8. As the demo user, copy a task's project ID from the URL, log out, log in as a different
   (freshly registered) user, and visit that same `/projects/<id>` URL directly → confirm a 404
   page, not the first user's project
9. Check the browser console for errors throughout — expect none

- [ ] **Step 3: Clean up test data**

Delete any manually-created test tasks/projects/users from Step 2 that the UI itself didn't already
remove, via `npx prisma studio` or a one-off script, so the seeded demo data stays the canonical
dev fixture.

- [ ] **Step 4: Update plan status**

Mark all checkboxes in this plan complete once every step above has actually passed.
