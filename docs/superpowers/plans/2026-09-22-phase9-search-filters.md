# Phase 9: Search & Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Ctrl+K search command palette (Projects + Tasks) and Status/Priority/Due-date filters on the Project Detail page's Kanban view.

**Architecture:** A new Server Action (`actions/search.ts`) runs two scoped, title/name-only Prisma queries and returns up to 5 results each; a Client Component (`SearchPalette`, built on shadcn's `Command`) debounces input, calls it, and renders results in a `CommandDialog`, mounted inside the always-present `Sidebar` so its `Ctrl+K` listener is live on every page. Project Detail filters reuse the exact `searchParams` + `router.push` pattern already used by `/completed`'s filter bar — a new `TaskFilters` Client Component pushes query params, and the existing Server Component page narrows its Prisma `where` and passes a smaller list into the unchanged `KanbanBoard`. Progress (`X/Y tasks`) is computed from a separate, unfiltered query so filters never distort it.

**Tech Stack:** shadcn `command` component (adds on top of already-installed `cmdk` dependency). No other new dependencies.

**Design doc:** `docs/superpowers/specs/2026-09-22-phase9-search-filters-design.md`

---

### Task 1: Add shadcn `command` component

**Files:**
- Create: `src/components/ui/command.tsx` (and any dependency it pulls in, e.g. `dialog.tsx`, via the CLI)

- [ ] **Step 1: Run the shadcn CLI**

Run: `npx shadcn@3.8.5 add command`

- [ ] **Step 2: Verify the file was added**

Run: `ls src/components/ui/command.tsx`
Expected: file exists.

- [ ] **Step 3: Verify the project still builds**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add shadcn command component"
```

---

### Task 2: Global search Server Action

**Files:**
- Create: `src/actions/search.ts`

- [ ] **Step 1: Implement**

`src/actions/search.ts`:
```ts
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export type SearchResult = {
  projects: { id: string; slug: string; name: string }[];
  tasks: { id: string; title: string; projectSlug: string; projectName: string }[];
};

const EMPTY_RESULT: SearchResult = { projects: [], tasks: [] };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

export async function search(query: string): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_RESULT;

  const userId = await requireUserId();

  const [projects, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { userId, name: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, slug: true, name: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { userId, title: { contains: trimmed, mode: "insensitive" } },
      select: { id: true, title: true, project: { select: { slug: true, name: true } } },
      take: 5,
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    projects,
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      projectSlug: task.project.slug,
      projectName: task.project.name,
    })),
  };
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/search.ts
git commit -m "Add global search server action"
```

---

### Task 3: `SearchPalette` component

**Files:**
- Create: `src/components/search/search-palette.tsx`

- [ ] **Step 1: Implement**

`src/components/search/search-palette.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { search, type SearchResult } from "@/actions/search";

const EMPTY_RESULT: SearchResult = { projects: [], tasks: [] };

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(EMPTY_RESULT);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(() => {
      search(trimmed).then((result) => {
        setResults(result);
        setLoading(false);
      });
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults(EMPTY_RESULT);
    }
  }

  function goTo(href: string) {
    handleOpenChange(false);
    router.push(href);
  }

  const hasResults = results.projects.length > 0 || results.tasks.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Search
        <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Search projects and tasks…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!hasResults ? (
            <CommandEmpty>{loading ? "Searching…" : "No results found."}</CommandEmpty>
          ) : null}
          {results.projects.length > 0 ? (
            <CommandGroup heading="Projects">
              {results.projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name}-${project.id}`}
                  onSelect={() => goTo(`/projects/${project.slug}`)}
                >
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.tasks.length > 0 ? (
            <CommandGroup heading="Tasks">
              {results.tasks.map((task) => (
                <CommandItem
                  key={task.id}
                  value={`${task.title}-${task.id}`}
                  onSelect={() => goTo(`/projects/${task.projectSlug}`)}
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{task.projectName}</span>
                    <span>{task.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
```

Note: `CommandItem`'s `value` is set to `"<title>-<id>"` rather than the bare title. cmdk requires unique `value`s per item (two tasks can share a title) and uses that same string for its own built-in fuzzy filter — appending the id keeps values unique while leaving the title as the leading, matched portion, so cmdk's filter still matches whatever the user typed (which is also what the server already matched on).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/search-palette.tsx
git commit -m "Add SearchPalette command component"
```

---

### Task 4: Mount `SearchPalette` in the sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Implement**

Add the import and render `<SearchPalette />` above the main nav list, inside `src/components/layout/sidebar.tsx`. The `Sidebar` component is rendered by the `(dashboard)` layout on every authenticated page and stays mounted (just CSS-hidden below the `md` breakpoint via its `hidden md:flex` classes), so `SearchPalette`'s `Ctrl+K` listener is effectively global across the app; the visible trigger button is desktop-only for now, matching this component's own visibility.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, secondaryNavItems, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { SearchPalette } from "@/components/search/search-palette";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center border-b px-4 font-semibold">Task Tracker</div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <SearchPalette />
        {navItems.map((item) => (
          <SidebarLink key={item.href} item={item} active={pathname === item.href} />
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t p-3">
        {secondaryNavItems.map((item) => (
          <SidebarLink key={item.href} item={item} active={pathname === item.href} />
        ))}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "Mount SearchPalette in the sidebar"
```

---

### Task 5: `TaskFilters` component (Project Detail page)

**Files:**
- Create: `src/components/tasks/task-filters.tsx`

- [ ] **Step 1: Implement**

`src/components/tasks/task-filters.tsx`:
```tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const DUE_OPTIONS = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "none", label: "No due date" },
];

export function TaskFilters() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(value) => updateParam("status", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("priority") ?? "all"}
        onValueChange={(value) => updateParam("priority", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("due") ?? "all"}
        onValueChange={(value) => updateParam("due", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Any due date" />
        </SelectTrigger>
        <SelectContent>
          {DUE_OPTIONS.map((option) => (
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
git add src/components/tasks/task-filters.tsx
git commit -m "Add TaskFilters component"
```

---

### Task 6: Wire filters into the Project Detail page

**Files:**
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `src/app/(dashboard)/projects/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { TaskStatus, TaskPriority } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { AddTaskButton } from "@/components/tasks/add-task-button";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskFilters } from "@/components/tasks/task-filters";
import type { TaskListItemData } from "@/components/tasks/task-list-item";
import type { ProjectInput } from "@/lib/validations/project";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; priority?: string; due?: string }>;
}) {
  const { slug } = await params;
  const { status, priority, due } = await searchParams;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);

  const project = await prisma.project.findFirst({
    where: { slug, userId },
    include: {
      tasks: {
        where: {
          ...(status ? { status: status as TaskStatus } : {}),
          ...(priority ? { priority: priority as TaskPriority } : {}),
          ...(due === "overdue" ? { dueDate: { lt: todayStart } } : {}),
          ...(due === "today" ? { dueDate: { gte: todayStart, lt: todayEnd } } : {}),
          ...(due === "upcoming" ? { dueDate: { gte: todayEnd } } : {}),
          ...(due === "none" ? { dueDate: null } : {}),
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Progress must reflect ALL of the project's tasks, never the filtered subset above — fetched
  // separately so an active filter can never distort the completed/total ratio.
  const [allProjects, allProjectTaskStatuses] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { projectId: project.id, userId },
      select: { status: true },
    }),
  ]);

  const { completedCount, totalCount, percent } = computeProjectProgress(
    allProjectTaskStatuses.map((task) => task.status)
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

  const hasActiveFilters = Boolean(status || priority || due);

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

      {totalCount > 0 ? <TaskFilters /> : null}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No tasks yet.</p>
          <AddTaskButton projects={allProjects} defaultProjectId={project.id} label="Add Task" />
        </div>
      ) : taskItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? "No tasks match these filters." : "No tasks yet."}
        </p>
      ) : (
        <KanbanBoard initialTasks={taskItems} projects={allProjects} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/projects/[slug]/page.tsx"
git commit -m "Add Status/Priority/Due-date filters to Project Detail page"
```

---

### Task 7: Final verification

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

1. On any dashboard page, press `Ctrl+K` (or click the "Search" button in the sidebar) — confirm the command palette opens.
2. Type `homepage` — confirm it debounces briefly then shows a "Tasks" group containing "Fix homepage header" with "Client Website" as its subtitle. Confirm no "Projects" group appears (no project is named "homepage").
3. Clear the query and type `website` — confirm a "Projects" group appears with both "Client Website" and "Personal Website".
4. Type a query that matches nothing (e.g. `zzzznomatch`) — confirm "No results found." appears.
5. Click a task result — confirm the palette closes and the browser navigates to that task's project page.
6. Re-open the palette (`Ctrl+K`) and press `Escape` — confirm it closes.
7. Navigate to the Client Website project page. Confirm the Status/Priority/Due-date filter row appears above the Kanban board.
8. Set Status to "To Do" — confirm the URL gains `?status=TODO` and only To-Do tasks render (still across their normal Kanban columns — with this filter there should effectively be one populated column).
9. Reset Status to "All statuses", then set Priority to "Low" — confirm only "Deploy to staging" (or whichever seeded task is Low priority) appears.
10. Reset Priority, then set Due date to "No due date" — confirm only tasks without a due date show, and confirm the project's `X/Y tasks · Z%` progress line does NOT change when any filter is applied (it must reflect all tasks, not the filtered view).
11. Pick a filter combination that matches nothing (e.g. Status "Completed" + Priority "Urgent" if no such task exists) — confirm "No tasks match these filters." renders instead of the "No tasks yet." + Add Task empty state.
12. Clear all filters — confirm the full task list and Kanban board return.
13. Check the browser console for errors throughout — expect none (aside from any pre-existing, unrelated intermittent dev-mode hydration warning already documented from Phase 8 verification).

- [ ] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-22-phase9-search-filters.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-phase9-search-filters.md
git commit -m "Mark Phase 9 plan complete after manual verification"
```
