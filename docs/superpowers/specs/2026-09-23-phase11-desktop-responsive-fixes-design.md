# Phase 11: Desktop Responsive Fixes — Design

## Goal

Fix four concrete desktop layout bugs reported by the user, plus one closely-related issue found
during investigation. This is scoped to desktop only — the spec's Responsive Design section covers
tablet/mobile separately (compact sidebar / bottom nav, already partly handled by the existing
`MobileNav` component), and is not part of this pass.

## Investigation summary (root causes, confirmed by reading the actual code before any fix)

1. **Kanban drag makes the page keep growing wider.** `KanbanCard` applies the drag transform
   directly to its own DOM node (`style={{ transform: "translate3d(x,y,0)" }}`) while the node
   stays in normal document flow — there's no `@dnd-kit/core` `DragOverlay`. CSS `transform`
   contributes to an ancestor's *scrollable* overflow region, and nothing between the card and
   `<body>` has `overflow-x-hidden` to clip it, so as `transform.x` grows during a drag, the page's
   real scrollable width grows with it. This is a well-documented dnd-kit pitfall; `DragOverlay`
   (which portals the dragged element to `<body>` with `position: fixed`, fully decoupled from the
   source's layout container) is dnd-kit's own documented fix.
2. **Sidebar scrolls away with the page.** `(dashboard)/layout.tsx` uses `min-h-screen` (a floor,
   not a cap) on both the outer row and inner column, and `<main>` has no height constraint or its
   own scroll container. Once page content exceeds the viewport height, the whole flex row —
   sidebar included — grows past the viewport and `<body>` becomes the scrolling context, so
   scrolling the page scrolls the sidebar too.
3. **Notes/Description textareas grow forever.** The shared `Textarea` component has
   `field-sizing-content` (auto-sizes to content) with no `max-h-*` anywhere, so nothing stops
   vertical growth as the user types.
4. **Long task titles can overflow their row/card.** Neither `TaskListItem` variant truncates its
   title. Titles can be up to 200 characters (schema limit) with no guaranteed whitespace, and
   flexbox's default `min-width: auto` lets an unbroken string force its row/card wider than its
   column — the same class of bug as #1, smaller in practice but worth closing while in this code.
5. **(Found during investigation) `SheetContent` itself doesn't scroll.** The task/project edit
   sheet is `h-full` with no `overflow-y-auto`. Even after capping textarea height (#3), a sheet
   with enough total form content could still overflow the viewport with no way to reach fields or
   the Save/Cancel buttons below the fold — directly relevant to the spec's "task creation and
   editing must work comfortably" requirement.

## Fixes

### 1. Kanban `DragOverlay`

`KanbanBoard` tracks the actively-dragged task (`useState<TaskListItemData | null>`), set in a new
`onDragStart` handler and cleared in both `onDragEnd` and a new `onDragCancel` handler (so
cancelling a drag via Escape doesn't leave a stale overlay). It renders a `<DragOverlay>` inside
`<DndContext>` showing that task's card. `KanbanCard` stops applying the `transform` style to its
own node entirely — dnd-kit's `useDraggable` still provides `attributes`/`listeners`/`setNodeRef`
for initiating the drag and the `isDragging` flag (kept, for the existing `opacity-50` "ghost slot"
look at the original position), but the actual moving visual is now the overlay, which is
`position: fixed` and immune to the ancestor-overflow-growth problem.

### 2. Sidebar-locked layout

`(dashboard)/layout.tsx` changes from `min-h-screen` to `h-screen overflow-hidden` on both the
outer row and inner column, and `<main>` gains `overflow-y-auto`. `Sidebar` needs no changes — as
a flex item in a row with a definite height, it stretches to fill that height automatically
(flexbox's default `align-items: stretch`). Only `<main>` becomes its own scroll container; the
sidebar never moves.

### 3. Textarea max-height

`src/components/ui/textarea.tsx` gains `max-h-40 overflow-y-auto` alongside its existing
`min-h-16`. It grows with content up to that cap (~10 lines) and then scrolls internally instead of
growing further. This is a shared primitive already used by both `TaskFormSheet` (Description,
Notes) and `ProjectFormSheet` (Description) — the same fix benefits both without extra work.

### 4. Task title truncation

Both `TaskListItem` variants' title `<button>` gain `truncate` — and, since `truncate` alone does
nothing on a flex item with the default `min-width: auto`, `min-w-0` alongside it (the row variant
also keeps its existing `flex-1`; the card variant gains `w-full` since it isn't otherwise
width-constrained in its `flex-col` parent).

### 5. Scrollable sheet content

`SheetContent` (`src/components/ui/sheet.tsx`) gains `overflow-y-auto` in its base class list, so
any sheet — not just the task form — scrolls internally if its content exceeds the viewport height,
instead of clipping silently.

## Files touched

- Modify: `src/components/tasks/kanban-board.tsx` (DragOverlay, drag-start/cancel tracking)
- Modify: `src/components/tasks/kanban-card.tsx` (remove transform style)
- Modify: `src/app/(dashboard)/layout.tsx` (height-locked scroll layout)
- Modify: `src/components/ui/textarea.tsx` (max-height + scroll)
- Modify: `src/components/tasks/task-list-item.tsx` (truncate both variants)
- Modify: `src/components/ui/sheet.tsx` (scrollable content)

## Testing

No new pure-logic functions — every change here is layout/CSS or drag-and-drop visual behavior.
Verification is manual: drag a Kanban card far to the right/left and confirm the page's scrollable
width never changes; confirm the sidebar stays fixed in place while scrolling a long page; type
several paragraphs into a task's Notes field and confirm it stops growing at the cap and scrolls
internally; confirm a task with a very long, unbroken title truncates with an ellipsis instead of
widening its row/card; confirm the task edit sheet itself scrolls if its content is taller than the
viewport (can be forced by shrinking the browser window height during the check).
