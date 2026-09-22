# Project Color Theming — Design

## Goal

Extend the app's "colorful" pass beyond the single warm accent + priority badges (already shipped)
by using each **project's own existing color** — the 8-swatch picker already stored on every
`Project` row, currently shown only as a small dot on `ProjectCard` — to visually tint the places
where a project's identity is the organizing context: the project list, a project's own detail
page, its Kanban cards, and project-grouped task list headers. Views organized by date or status
rather than by project (Upcoming, Completed, the Dashboard's Upcoming Tasks preview) are
explicitly left unchanged, per the scoping decision made during brainstorming.

The app's one warm terracotta/orange **action** accent (buttons, links, focus rings, shipped in
the warm-color-system work) is untouched by this — it stays the single consistent "this is
clickable" signal, while project colors are a separate "this belongs to project X" signal layered
on top. This mirrors how Notion keeps one blue action color while letting individual pages/icons
carry their own color.

## 1. Color lookup

The 8 stored hex values (`PROJECT_COLORS` in `src/lib/validations/project.ts`) map exactly onto
Tailwind's own named palettes at the 500 shade:

| Hex | Tailwind family |
|---|---|
| `#6366f1` | indigo |
| `#22c55e` | green |
| `#f97316` | orange |
| `#ef4444` | red |
| `#0ea5e9` | sky |
| `#a855f7` | purple |
| `#eab308` | yellow |
| `#64748b` | slate |

New `src/lib/project-color-styles.ts` exports three lookups keyed by that same 8-value hex union
(mirroring how `priority-styles.ts` already keys off `TASK_PRIORITIES`). Per a follow-up request
during brainstorming, the larger surfaces use a **soft gradient** rather than a flat tint — gentler
and more "lively" than a single flat color block, while staying soft enough not to trip the
spec's own "avoid excessive gradients" guardrail (the operative word there is *excessive*; one
subtle two-stop wash is not that):

- `PROJECT_COLOR_CARD_CLASSES`: a soft diagonal gradient from the color's lightest tint down to
  the theme's own `background` token, plus a matching border (light- and dark-mode aware), e.g.
  indigo → `bg-gradient-to-br from-indigo-50 to-background border-indigo-200 dark:from-indigo-950/40
  dark:to-background dark:border-indigo-900` — for card-sized surfaces belonging to one project.
- `PROJECT_COLOR_HEADER_CLASSES`: a wider, even softer horizontal gradient wash (fading to
  transparent) sized for a page header band, e.g. indigo → `bg-gradient-to-r from-indigo-100
  via-indigo-50 to-transparent dark:from-indigo-950/30 dark:via-indigo-950/10 dark:to-transparent`.
- `PROJECT_COLOR_ACCENT_CLASSES`: a solid (non-gradient) `border-l-<color>-500` — kept flat
  deliberately, for a small, dense element (a group heading inside a list that already mixes
  several projects' worth of visual weight) where a gradient would have too little surface area to
  read as anything but noise.

`to-background` resolves through this app's existing `@theme inline` mapping
(`--color-background: var(--background)`), so the gradient fades into whatever the current warm
neutral background actually is — not a hardcoded white — and stays correct if that token ever
changes again.

Since `Project.color` is Zod-`enum`-validated (`z.enum(PROJECT_COLORS)`) at every write path, every
stored value is guaranteed to be one of these 8 — no "unknown color" fallback case exists.

## 2. Where it's applied

- **`ProjectCard`** (used on `/projects` and the Dashboard's Recent Projects section): the card's
  outer container picks up `PROJECT_COLOR_CARD_CLASSES[project.color]` instead of its current
  plain neutral `rounded-lg border`. The small color dot next to the project name is removed —
  redundant once the whole card carries that tint.
- **Project Detail page header** (`/projects/[slug]`): the header block gets a
  `PROJECT_COLOR_HEADER_CLASSES[project.color]` soft gradient wash background, so the page
  immediately reads as "you're inside Project X" without a harsh block of color.
- **Kanban task cards**: the card variant of `TaskListItem` gains an optional `projectColor` prop;
  when set, its background picks up `PROJECT_COLOR_CARD_CLASSES[projectColor]` instead of the
  plain `bg-background`. Threaded through `KanbanBoard → KanbanColumn → KanbanCard → TaskListItem`
  as a single value, since a Kanban board is always scoped to one project — every card on it
  shares the same color, no per-task lookup needed.
- **Project-grouped task list headings** (`TaskGroupList`, used by `/today` and the Dashboard's
  Today's Tasks section — both already group tasks under a project-name heading): each group's
  container gains a `PROJECT_COLOR_ACCENT_CLASSES[group.projectColor]` left-border accent. This
  requires `ProjectTaskGroup` (and `groupTasksByProject`'s input) to carry a `projectColor` field
  alongside the `projectName` it already carries, which in turn requires the handful of Prisma
  queries that feed this pipeline (Today page's three task queries, the Dashboard's
  `todaysTasksRaw` query) to add `color: true` to their existing `project: { select: { ... } }`.
- **`TaskListItem`'s "row" variant is unaffected** — it's used by `/today`, `/upcoming`,
  `/completed`, and the Kanban board's row-mode call sites don't apply here; the row variant simply
  ignores the new `projectColor` prop when present, since coloring every individual row (rather
  than the group heading above it) would be visually noisy in a list that already shows several
  projects' tasks side by side.

## 3. Explicitly out of scope

- `/upcoming` and `/completed` pages, and the Dashboard's `UpcomingTaskRow` preview — these are
  grouped by due date or left ungrouped, not by project, so there's no natural "this whole section
  belongs to one project" moment to color. Confirmed with the user during brainstorming.
- The single warm action accent (buttons/links/focus rings) — unchanged, stays the one consistent
  "clickable" signal across the whole app regardless of which project you're viewing.

## Files touched

- Create: `src/lib/project-color-styles.ts`
- Modify: `src/components/projects/project-card.tsx` (card tint, remove the now-redundant dot)
- Modify: `src/app/(dashboard)/projects/[slug]/page.tsx` (header accent border, pass
  `projectColor` into `KanbanBoard`)
- Modify: `src/components/tasks/kanban-board.tsx`, `kanban-column.tsx`, `kanban-card.tsx` (thread
  `projectColor` prop through)
- Modify: `src/components/tasks/task-list-item.tsx` (new optional `projectColor` prop, applied
  only in the "card" variant)
- Modify: `src/lib/group-tasks-by-project.ts` (`ProjectTaskGroup` gains `projectColor`)
- Modify: `src/components/tasks/task-group-list.tsx` (accent border per group)
- Modify: `src/app/(dashboard)/today/page.tsx` (add `color: true` to all 3 project selects, pass
  `projectColor` into each group's task mapping)
- Modify: `src/app/(dashboard)/page.tsx` (same, for `todaysTasksRaw`)

## Testing

No new pure-logic functions beyond a straightforward extension of `groupTasksByProject`'s existing
signature (its existing test suite gets one more field asserted on, not new logic to test).
Verification is manual and visual, in both light and dark mode: confirm each of the app's two
seeded projects (different colors) renders visually distinct on the project list, its own detail
page, its Kanban cards, and its Today-page group heading — and confirm Upcoming/Completed remain
unchanged.
