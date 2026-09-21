# Phase 2: Projects CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/projects` placeholder with real Projects CRUD — list, create, edit, archive, delete — fully scoped to the authenticated user, with computed (never stored) progress per project.

**Architecture:** `/projects` is a Server Component that queries Prisma directly (no action needed for reads) and computes progress/relative-time per project before handing plain-serializable data to small Client Component "islands" (new-project button, per-card actions menu, the shared create/edit sheet, the delete confirmation dialog). Mutations go through `actions/projects.ts` Server Actions that scope every `update`/`delete` query by `{ id, userId }` in the `where` clause — this is the authorization boundary, not a separate check-then-act step, so a bug can't accidentally leak cross-user writes.

**Tech Stack:** Next.js 15 Server Components + Server Actions, Prisma 5, Zod, React Hook Form, shadcn/ui (`textarea`, `select`, `alert-dialog`, `badge` — new; reuses `sheet`, `form`, `button`, `input`, `dropdown-menu` from Phase 1), Vitest for the pure-logic units.

**Design doc:** `docs/superpowers/specs/2026-09-21-phase2-projects-crud-design.md`

---

### Task 1: Add new shadcn components

**Files:**
- Create: `src/components/ui/{textarea,select,alert-dialog,badge}.tsx`

- [ ] **Step 1: Add the components**

```bash
npx shadcn@3.8.5 add textarea select alert-dialog badge --yes
```

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds; the four new files exist under `src/components/ui/`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui
git commit -m "Add textarea, select, alert-dialog, badge shadcn components"
```

---

### Task 2: Project progress calculation (TDD)

**Files:**
- Create: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/progress.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeProjectProgress } from "./progress";

describe("computeProjectProgress", () => {
  it("returns zeroes for a project with no tasks", () => {
    expect(computeProjectProgress([])).toEqual({
      completedCount: 0,
      totalCount: 0,
      percent: 0,
    });
  });

  it("returns 100 percent when every task is completed", () => {
    expect(computeProjectProgress(["COMPLETED", "COMPLETED"])).toEqual({
      completedCount: 2,
      totalCount: 2,
      percent: 100,
    });
  });

  it("returns 0 percent when no task is completed", () => {
    expect(computeProjectProgress(["TODO", "IN_PROGRESS"])).toEqual({
      completedCount: 0,
      totalCount: 2,
      percent: 0,
    });
  });

  it("rounds a partial completion ratio to the nearest whole percent", () => {
    expect(computeProjectProgress(["COMPLETED", "TODO", "TODO"])).toEqual({
      completedCount: 1,
      totalCount: 3,
      percent: 33,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './progress'`

- [ ] **Step 3: Implement**

`src/lib/progress.ts`:
```ts
export type ProjectProgress = {
  completedCount: number;
  totalCount: number;
  percent: number;
};

export function computeProjectProgress(taskStatuses: string[]): ProjectProgress {
  const totalCount = taskStatuses.length;
  const completedCount = taskStatuses.filter((status) => status === "COMPLETED").length;
  const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percent };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/progress.ts src/lib/progress.test.ts
git commit -m "Add project progress calculation"
```

---

### Task 3: Relative time formatting (TDD)

**Files:**
- Create: `src/lib/format-relative-time.ts`
- Test: `src/lib/format-relative-time.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/format-relative-time.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("returns 'just now' for under a minute ago", () => {
    const date = new Date("2026-09-21T11:59:31.000Z");
    expect(formatRelativeTime(date, now)).toBe("just now");
  });

  it("formats minutes ago", () => {
    const date = new Date("2026-09-21T11:55:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("5 minutes ago");
  });

  it("uses singular for exactly one hour ago", () => {
    const date = new Date("2026-09-21T11:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("1 hour ago");
  });

  it("formats days ago", () => {
    const date = new Date("2026-09-19T12:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("2 days ago");
  });

  it("falls back to a short date beyond a week", () => {
    const date = new Date("2026-09-01T12:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("Sep 1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './format-relative-time'`

- [ ] **Step 3: Implement**

`src/lib/format-relative-time.ts`:
```ts
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/format-relative-time.ts src/lib/format-relative-time.test.ts
git commit -m "Add relative time formatting"
```

---

### Task 4: Project validation schema (TDD)

**Files:**
- Create: `src/lib/validations/project.ts`
- Test: `src/lib/validations/project.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/validations/project.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { projectSchema, PROJECT_COLORS } from "./project";

describe("projectSchema", () => {
  it("accepts a valid project payload", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      description: "Marketing site redesign",
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty description", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      description: "",
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = projectSchema.safeParse({
      name: "",
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 100 characters", () => {
    const result = projectSchema.safeParse({
      name: "a".repeat(101),
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a color outside the fixed palette", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      color: "#000000",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      color: PROJECT_COLORS[0],
      status: "NOT_A_STATUS",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './project'`

- [ ] **Step 3: Implement**

`src/lib/validations/project.ts`:
```ts
import { z } from "zod";

export const PROJECT_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#eab308",
  "#64748b",
] as const;

export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
  color: z.enum(PROJECT_COLORS),
  status: z.enum(PROJECT_STATUSES),
});

export type ProjectInput = z.infer<typeof projectSchema>;
```

Note: `color`/`status` are defined as our own string-literal unions here rather than imported from
`@prisma/client` — this file is imported by client components, and keeping it decoupled from the
generated Prisma module avoids any risk of pulling Prisma's client/engine code into a client
bundle. `actions/projects.ts` (Task 5, server-only) bridges the two.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/project.ts src/lib/validations/project.test.ts
git commit -m "Add project validation schema"
```

---

### Task 5: Project Server Actions

**Files:**
- Create: `src/actions/projects.ts`

- [ ] **Step 1: Implement**

`src/actions/projects.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { projectSchema, type ProjectInput } from "@/lib/validations/project";

export type ProjectActionResult = { success: true } | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createProject(input: ProjectInput): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  await prisma.project.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      status: parsed.data.status as ProjectStatus,
    },
  });

  revalidatePath("/projects");
  return { success: true };
}

export async function updateProject(
  projectId: string,
  input: ProjectInput
): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      status: parsed.data.status as ProjectStatus,
    },
  });

  if (result.count === 0) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function archiveProject(projectId: string): Promise<ProjectActionResult> {
  const userId = await requireUserId();
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  if (result.count === 0) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProject(projectId: string): Promise<ProjectActionResult> {
  const userId = await requireUserId();
  const result = await prisma.project.deleteMany({ where: { id: projectId, userId } });

  if (result.count === 0) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  return { success: true };
}
```

`updateMany`/`deleteMany` with `{ id, userId }` in the `where` clause (rather than fetch-then-check-then-write) is deliberate: it makes the ownership check atomic and part of the query itself, so there's no window where a logic bug could act on another user's row. `result.count === 0` distinguishes "not found or not yours" from success — callers don't need to know which, both are just "can't do that."

No unit test for this file: it's a thin Prisma/Auth.js wrapper over the already-tested validation schema, and testing it meaningfully would require a real or mocked database — that's the integration-test territory this project's testing approach explicitly excludes (per the "unit tests for logic only" decision made for Phase 1). It's covered by the manual browser verification in Task 11 instead.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/projects.ts
git commit -m "Add project Server Actions"
```

---

### Task 6: Shared create/edit project sheet

**Files:**
- Create: `src/components/projects/project-form-sheet.tsx`

- [ ] **Step 1: Implement**

`src/components/projects/project-form-sheet.tsx`:
```tsx
"use client";

import { useEffect } from "react";
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
import { cn } from "@/lib/utils";
import {
  projectSchema,
  PROJECT_COLORS,
  PROJECT_STATUSES,
  type ProjectInput,
} from "@/lib/validations/project";
import { createProject, updateProject } from "@/actions/projects";

const STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const EMPTY_VALUES: ProjectInput = {
  name: "",
  description: "",
  color: PROJECT_COLORS[0],
  status: "ACTIVE",
};

type ProjectFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: { id: string } & ProjectInput;
};

export function ProjectFormSheet({ open, onOpenChange, project }: ProjectFormSheetProps) {
  const isEdit = !!project;
  const form = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: project ?? EMPTY_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(project ?? EMPTY_VALUES);
    }
  }, [open, project, form]);

  async function onSubmit(values: ProjectInput) {
    const result = project
      ? await updateProject(project.id, values)
      : await createProject(values);

    if (result.success) {
      toast.success(isEdit ? "Project updated" : "Project created");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Project" : "New Project"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-4 px-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client Website" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="What is this project about?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-label={`Color ${color}`}
                          onClick={() => field.onChange(color)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2",
                            field.value === color ? "border-foreground" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      {PROJECT_STATUSES.map((status) => (
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
            <SheetFooter className="px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create project"}
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (Full render verification happens in Task 11's manual browser pass, once this is wired into the page.)

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/project-form-sheet.tsx
git commit -m "Add shared create/edit project sheet"
```

---

### Task 7: New Project button

**Files:**
- Create: `src/components/projects/new-project-button.tsx`

- [ ] **Step 1: Implement**

`src/components/projects/new-project-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormSheet } from "./project-form-sheet";

export function NewProjectButton({ label = "New Project" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label}
      </Button>
      <ProjectFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/new-project-button.tsx
git commit -m "Add New Project button"
```

---

### Task 8: Delete confirmation dialog

**Files:**
- Create: `src/components/projects/delete-project-dialog.tsx`

- [ ] **Step 1: Implement**

`src/components/projects/delete-project-dialog.tsx`:
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
import { deleteProject } from "@/actions/projects";

type DeleteProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
};

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: DeleteProjectDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteProject(projectId);
    setIsDeleting(false);
    if (result.success) {
      toast.success("Project deleted");
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{projectName}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the project and all of its tasks. This cannot be undone.
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

`event.preventDefault()` in `AlertDialogAction`'s `onClick` stops Radix's default auto-close on
click — needed because the dialog should stay open (showing "Deleting…") until the async action
resolves, then close itself via `onOpenChange(false)` only on success.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/delete-project-dialog.tsx
git commit -m "Add delete project confirmation dialog"
```

---

### Task 9: Project card

**Files:**
- Create: `src/components/projects/project-card.tsx`

- [ ] **Step 1: Implement**

`src/components/projects/project-card.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveProject } from "@/actions/projects";
import { ProjectFormSheet } from "./project-form-sheet";
import { DeleteProjectDialog } from "./delete-project-dialog";
import type { ProjectInput } from "@/lib/validations/project";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export type ProjectCardData = ProjectInput & {
  id: string;
  completedCount: number;
  totalCount: number;
  percent: number;
  updatedAtLabel: string;
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleArchive() {
    const result = await archiveProject(project.id);
    if (result.success) {
      toast.success("Project archived");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
            {project.name}
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Project actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>Open</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>Archive</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {project.description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      ) : null}

      <Badge variant="secondary" className="w-fit">
        {STATUS_LABELS[project.status]}
      </Badge>

      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${project.percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {project.totalCount === 0
            ? "No tasks yet"
            : `${project.completedCount}/${project.totalCount} tasks · ${project.percent}%`}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">Updated {project.updatedAtLabel}</p>

      <ProjectFormSheet open={editOpen} onOpenChange={setEditOpen} project={project} />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/project-card.tsx
git commit -m "Add project card"
```

---

### Task 10: Wire up the /projects page

**Files:**
- Modify: `src/app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Replace the placeholder page**

`src/app/(dashboard)/projects/page.tsx`:
```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import type { ProjectInput } from "@/lib/validations/project";

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

  const projectCards: ProjectCardData[] = projects.map((project) => {
    const { completedCount, totalCount, percent } = computeProjectProgress(
      project.tasks.map((task) => task.status)
    );

    return {
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      color: project.color as ProjectInput["color"],
      status: project.status,
      completedCount,
      totalCount,
      percent,
      updatedAtLabel: formatRelativeTime(project.updatedAt),
    };
  });

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

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds, `/projects` still listed in the route table.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/projects/page.tsx"
git commit -m "Wire up the /projects page with real data"
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
real browser (not curl — this flow is all Server Actions and client state):

1. `/projects` shows the two seeded projects (Client Website, Personal Website) with correct
   progress bars and task counts matching the seed data
2. Click "+ New Project", fill the form, submit → new project appears in the grid without a full
   page reload, success toast shown
3. Open a project's actions menu → Edit → change the name/color/status → Save → card updates
   immediately
4. Actions menu → Archive → status badge updates to "Archived" without a confirmation prompt
5. Actions menu → Delete → confirm the AlertDialog blocks accidental deletion (click Cancel,
   verify project still there), then confirm again and click Delete → project disappears
6. Register a second, fresh account, log in as it, visit `/projects` → confirm it shows the empty
   state ("Create your first project…"), not the first user's projects
7. Check the browser console for errors throughout — expect none

- [ ] **Step 3: Clean up test data**

Delete any manually-created test projects/users from steps 2–6 that weren't already removed via
the UI itself, via `npx prisma studio` or a one-off script, so the seeded demo data stays the
canonical dev fixture.

- [ ] **Step 4: Update plan status**

Mark all checkboxes in this plan complete once every step above has actually passed.
