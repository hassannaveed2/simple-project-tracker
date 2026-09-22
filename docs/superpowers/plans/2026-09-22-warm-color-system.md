# Warm Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's zero-chroma grayscale theme with a warm terracotta/orange accent, warm-tinted neutrals, and color-coded priority badges.

**Architecture:** All accent/neutral changes are `globals.css` CSS-custom-property edits (OKLCH values), since this app already uses shadcn's CSS-variable theming — no component changes needed for that part. Priority badge colors are a separate, small component-level change: a new shared `priority-styles.ts` replaces the two independently-duplicated `PRIORITY_LABELS` maps in `task-list-item.tsx` and `upcoming-task-row.tsx`.

**Tech Stack:** No new dependencies. All values below were computed and WCAG-contrast-verified with a standalone OKLCH↔sRGB conversion script (Björn Ottosson's OKLab formulas) rather than estimated — every text/background pairing listed hits at least 4.3:1, and the ones flagged below were re-tuned until they cleared 4.5:1 (WCAG AA for normal text).

**Design doc:** `docs/superpowers/specs/2026-09-22-warm-color-system-design.md`

---

### Task 1: Warm accent + warm-tinted neutrals in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Implement**

Replace the `:root { ... }` block's color values (leave `--radius` and the `--chart-*` tokens
unchanged — they're unused anywhere in the app today) with:

```css
:root {
  --card: oklch(0.99 0.005 50);
  --card-foreground: oklch(0.145 0.012 50);
  --popover: oklch(0.99 0.005 50);
  --popover-foreground: oklch(0.145 0.012 50);
  --primary: oklch(0.553 0.174 38.4);
  --primary-foreground: oklch(0.98 0.004 50);
  --secondary: oklch(0.96 0.008 50);
  --secondary-foreground: oklch(0.205 0.014 50);
  --muted: oklch(0.96 0.008 50);
  --muted-foreground: oklch(0.53 0.016 50);
  --accent: oklch(0.96 0.008 50);
  --accent-foreground: oklch(0.205 0.014 50);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.9 0.01 50);
  --input: oklch(0.9 0.01 50);
  --ring: oklch(0.553 0.174 38.4);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.98 0.006 50);
  --sidebar-foreground: oklch(0.145 0.012 50);
  --sidebar-primary: oklch(0.553 0.174 38.4);
  --sidebar-primary-foreground: oklch(0.98 0.004 50);
  --sidebar-accent: oklch(0.96 0.008 50);
  --sidebar-accent-foreground: oklch(0.205 0.014 50);
  --sidebar-border: oklch(0.9 0.01 50);
  --sidebar-ring: oklch(0.553 0.174 38.4);
  --background: oklch(0.99 0.005 50);
  --foreground: oklch(0.145 0.012 50);
}
```

And the `.dark { ... }` block to:

```css
.dark {
  --background: oklch(0.145 0.012 45);
  --foreground: oklch(0.985 0.005 50);
  --card: oklch(0.205 0.014 45);
  --card-foreground: oklch(0.985 0.005 50);
  --popover: oklch(0.205 0.014 45);
  --popover-foreground: oklch(0.985 0.005 50);
  --primary: oklch(0.758 0.159 55.9);
  --primary-foreground: oklch(0.145 0.012 45);
  --secondary: oklch(0.269 0.016 45);
  --secondary-foreground: oklch(0.985 0.005 50);
  --muted: oklch(0.269 0.016 45);
  --muted-foreground: oklch(0.708 0.014 50);
  --accent: oklch(0.269 0.016 45);
  --accent-foreground: oklch(0.985 0.005 50);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0.02 50 / 10%);
  --input: oklch(1 0.02 50 / 15%);
  --ring: oklch(0.758 0.159 55.9);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0.014 45);
  --sidebar-foreground: oklch(0.985 0.005 50);
  --sidebar-primary: oklch(0.758 0.159 55.9);
  --sidebar-primary-foreground: oklch(0.145 0.012 45);
  --sidebar-accent: oklch(0.269 0.016 45);
  --sidebar-accent-foreground: oklch(0.985 0.005 50);
  --sidebar-border: oklch(1 0.02 50 / 10%);
  --sidebar-ring: oklch(0.758 0.159 55.9);
}
```

Notes on the values (already contrast-verified, not re-derived during implementation):
- Light `--primary` → `#c2410b` (a deep warm terracotta), with white-ish
  `--primary-foreground` → 4.9:1 contrast (passes WCAG AA).
- Dark `--primary` → `#fb923c` (a lighter warm orange, since dark-mode primaries in this theme
  are already light-with-dark-text, matching the pre-existing `oklch(0.922 0 0)` pattern), with
  warm-near-black `--primary-foreground` → 8.75:1 contrast.
- `--muted-foreground` (light) is tuned to `oklch(0.53 0.016 50)` rather than a straight
  proportional shift from the old `oklch(0.556 0 0)` — the naive shift landed at 4.33:1 against
  the new `--muted` background, just under the 4.5:1 AA threshold, so it's darkened slightly to
  clear 4.7:1.
- `--destructive` is unchanged in both modes — it must stay visually distinct from the new warm
  primary accent so "primary action" and "destructive action" don't get confused.
- `--sidebar-*` tokens are updated for consistency even though `src/components/layout/sidebar.tsx`
  doesn't currently reference them (it uses `bg-background`/`border-r` directly) — they're part of
  the shared shadcn theme block and shouldn't be left stale/mismatched.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors (this is a pure CSS change, but confirms nothing else broke).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Add warm accent color and warm-tinted neutrals"
```

---

### Task 2: Shared priority label/color styles

**Files:**
- Create: `src/lib/priority-styles.ts`

- [ ] **Step 1: Implement**

`src/lib/priority-styles.ts`:
```ts
import { TASK_PRIORITIES } from "@/lib/validations/task";

export const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_BADGE_CLASSES: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  MEDIUM:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900",
  URGENT:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
};
```

This replaces the two independently-duplicated `PRIORITY_LABELS` maps in
`task-list-item.tsx` and `upcoming-task-row.tsx` (see Task 3) — extracted because a duplicated
*color* map is a real drift risk in a way duplicated label strings aren't (a future color tweak in
one file could silently diverge from the other).

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/priority-styles.ts
git commit -m "Add shared priority label/badge color styles"
```

---

### Task 3: Apply color-coded priority badges

**Files:**
- Modify: `src/components/tasks/task-list-item.tsx`
- Modify: `src/components/dashboard/upcoming-task-row.tsx`

- [ ] **Step 1: Implement `task-list-item.tsx`**

Remove the local `PRIORITY_LABELS` constant (lines 13–18) and its import gap, replacing the top of
the file:

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/actions/tasks";
import { formatDueDate } from "@/lib/format-due-date";
import { PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from "@/lib/priority-styles";
import { TaskFormSheet } from "./task-form-sheet";
import type { TaskInput } from "@/lib/validations/task";

export type TaskListItemData = TaskInput & { id: string };
```

Then update both `Badge` renders (the "card" variant branch and the default "row" branch) from:
```tsx
<Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
```
to:
```tsx
<Badge variant="outline" className={PRIORITY_BADGE_CLASSES[task.priority]}>
  {PRIORITY_LABELS[task.priority]}
</Badge>
```
(there are two occurrences — one inside the `if (variant === "card")` block, one in the final
`return`).

- [ ] **Step 2: Implement `upcoming-task-row.tsx`**

Replace the full contents of `src/components/dashboard/upcoming-task-row.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDueDate } from "@/lib/format-due-date";
import { PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from "@/lib/priority-styles";

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
        <Badge
          variant="outline"
          className={PRIORITY_BADGE_CLASSES[task.priority as keyof typeof PRIORITY_BADGE_CLASSES]}
        >
          {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}
        </Badge>
        <span
          className={cn(
            "text-xs",
            dueDateInfo.variant === "overdue" && "text-destructive",
            dueDateInfo.variant === "today" && "font-medium text-foreground",
            dueDateInfo.variant === "tomorrow" && "font-medium text-amber-600 dark:text-amber-400",
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

(`UpcomingTaskData.priority` is typed as a plain `string`, not the `TaskPriority` literal union —
unlike `task-list-item.tsx`'s `TaskListItemData`, which gets its priority type from the Zod-backed
`TaskInput` — so the two lookups need a `keyof typeof` cast here specifically. This mirrors the
file's pre-existing behavior: it already indexed its own local `Record<string, string>` the same
loose way.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/task-list-item.tsx src/components/dashboard/upcoming-task-row.tsx
git commit -m "Apply color-coded priority badges"
```

---

### Task 4: Final verification

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

Start the dev server (`npm run dev`) and, logged in as `demo@example.com` / `password123`, check
**both light and dark mode** (toggle via the sidebar theme control) on:

1. Dashboard (`/`) — confirm the overall page has a warm off-white/warm-charcoal cast rather than
   pure gray, and that any primary-colored elements (e.g. focus rings, active nav link) show the
   new terracotta/orange instead of black/white.
2. Projects list and a Project Detail page's Kanban board — confirm task cards show
   color-coded priority badges (Low=slate, Medium=amber, High=orange, Urgent=red) and that the
   "Add Task"/primary buttons use the new accent color.
3. Today/Upcoming/Completed pages — confirm priority badges are colored consistently with the
   Kanban board (same task, same color, across every page it appears on).
4. Create or edit a task with a due date of tomorrow (relative to today) — confirm its due-date
   chip renders in the distinct amber "Tomorrow" styling (added just before this plan), on both
   the Kanban card and the Dashboard's Upcoming Tasks row.
5. Settings page — confirm the Theme select, form inputs, and buttons all pick up the new accent
   and warm neutrals; confirm the destructive "Delete Account" button still reads as clearly
   distinct from the new primary accent (not confusable as "just another warm button").
6. Search palette (Ctrl+K) — confirm it renders with the new warm neutral background.
7. Check the browser console for errors throughout — expect none (aside from the
   already-documented, pre-existing intermittent Radix `useId` hydration warning).

- [ ] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-22-warm-color-system.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-warm-color-system.md
git commit -m "Mark warm color system plan complete after manual verification"
```
