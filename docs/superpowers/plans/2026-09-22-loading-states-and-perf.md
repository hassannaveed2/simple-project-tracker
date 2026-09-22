# Loading States & Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an animated loading indicator on every page navigation via Next.js's built-in `loading.tsx` mechanism, and fix a dead `revalidatePath` call that uses a project's raw id instead of its slug.

**Architecture:** One shared `PageLoading` spinner component, referenced by a `loading.tsx` in every route segment under `(dashboard)`. Since `loading.tsx` lives inside the route group, only the `<main>` content area re-renders as loading — the Sidebar (rendered one level up, in `(dashboard)/layout.tsx`) stays mounted and interactive through every navigation. Separately, `tasks.ts`'s four mutation functions each already fetch the task's project — the fix adds `slug: true` to those existing `select`s and revalidates by slug instead of id.

**Tech Stack:** No new dependencies — `Loader2` is already available from the installed `lucide-react`.

**Design doc:** `docs/superpowers/specs/2026-09-22-loading-states-and-perf-design.md`

---

### Task 1: Shared `PageLoading` component

**Files:**
- Create: `src/components/ui/page-loading.tsx`

- [x] **Step 1: Implement**

`src/components/ui/page-loading.tsx`:
```tsx
import { Loader2 } from "lucide-react";

export function PageLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/page-loading.tsx
git commit -m "Add shared PageLoading spinner component"
```

---

### Task 2: `loading.tsx` on every dashboard route

**Files:**
- Create: `src/app/(dashboard)/loading.tsx`
- Create: `src/app/(dashboard)/projects/loading.tsx`
- Create: `src/app/(dashboard)/projects/[slug]/loading.tsx`
- Create: `src/app/(dashboard)/today/loading.tsx`
- Create: `src/app/(dashboard)/upcoming/loading.tsx`
- Create: `src/app/(dashboard)/completed/loading.tsx`
- Create: `src/app/(dashboard)/settings/loading.tsx`

- [x] **Step 1: Implement**

Each of the 7 files above has the identical content:
```tsx
import { PageLoading } from "@/components/ui/page-loading";

export default function Loading() {
  return <PageLoading />;
}
```

- [x] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/loading.tsx" "src/app/(dashboard)/projects/loading.tsx" "src/app/(dashboard)/projects/[slug]/loading.tsx" "src/app/(dashboard)/today/loading.tsx" "src/app/(dashboard)/upcoming/loading.tsx" "src/app/(dashboard)/completed/loading.tsx" "src/app/(dashboard)/settings/loading.tsx"
git commit -m "Add loading.tsx to every dashboard route"
```

---

### Task 3: Fix `revalidatePath` to use the project slug

**Files:**
- Modify: `src/actions/tasks.ts`

- [x] **Step 1: `createTask`**

Change the project lookup's `select` from `{ id: true, name: true }` to
`{ id: true, name: true, slug: true }`, and change:
```ts
revalidatePath(`/projects/${parsed.data.projectId}`);
```
to:
```ts
revalidatePath(`/projects/${project.slug}`);
```

- [x] **Step 2: `updateTask`**

Same change: the project lookup's `select` gains `slug: true`, and:
```ts
revalidatePath(`/projects/${parsed.data.projectId}`);
```
becomes:
```ts
revalidatePath(`/projects/${project.slug}`);
```

- [x] **Step 3: `updateTaskStatus`**

This function loads the project via a nested `project: { select: { name: true } }` — widen it to
`project: { select: { name: true, slug: true } }`, and change:
```ts
revalidatePath(`/projects/${task.projectId}`);
```
to:
```ts
revalidatePath(`/projects/${task.project.slug}`);
```

- [x] **Step 4: `deleteTask`**

This function currently selects `{ projectId: true }`, and `task.projectId` is used nowhere else
in the function besides the `revalidatePath` call being fixed here — replace it outright with the
project's slug:
```ts
const task = await prisma.task.findFirst({
  where: { id: taskId, userId },
  select: { project: { select: { slug: true } } },
});
```
and change:
```ts
revalidatePath(`/projects/${task.projectId}`);
```
to:
```ts
revalidatePath(`/projects/${task.project.slug}`);
```

- [x] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [x] **Step 6: Commit**

```bash
git add src/actions/tasks.ts
git commit -m "Fix revalidatePath to use project slug instead of raw id"
```

---

### Task 4: Final verification

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

1. Open Chrome DevTools → Network tab → set throttling to "Slow 3G" (or similar), to make the
   loading window clearly visible for this check.
2. Click between Dashboard / Projects / Today / Upcoming / Completed / Settings in the sidebar —
   confirm a centered spinner appears in the content area immediately on each click, and the
   Sidebar itself stays visible and clickable throughout (you can click a different link again
   while one is still loading).
3. Open a project's detail page — confirm its own spinner shows during that navigation too.
4. Turn network throttling back off.
5. On a Project Detail page, create a task, then edit its priority, then delete it — confirm the
   Kanban board reflects each change correctly (proving the `revalidatePath` slug fix didn't
   regress the existing "page updates after a mutation" behavior — this was already working via
   force-dynamic rendering, so this step is a regression check, not new behavior to observe).
6. Check the browser console for errors throughout — expect none (aside from the
   already-documented, pre-existing intermittent Radix `useId` hydration warning).

- [x] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-22-loading-states-and-perf.md
```

- [x] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-loading-states-and-perf.md
git commit -m "Mark loading states & performance plan complete after manual verification"
```
