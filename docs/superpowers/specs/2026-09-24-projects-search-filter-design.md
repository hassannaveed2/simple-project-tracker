# Projects Page Search Filter Design

**Status:** Approved by user in conversation.

## Goal

A search box on `/projects` that filters the project grid by name.

## Scope

- Matches `Project.name` only (case-insensitive `contains`), not description.
- Search box only — no status filter dropdown added (Project.status has no filter UI anywhere
  today; out of scope here, can be a separate future request).

## Design

Mirrors the existing `CompletedFilters` pattern (`src/components/completed/completed-filters.tsx`)
exactly, since it's already the established URL-searchParam-based filter convention in this app:

- New client component `src/components/projects/project-filters.tsx`: a single `Input` + submit
  `Button` in a `<form>`, writing `?q=<value>` onto the current URL via `useRouter`/`useSearchParams`
  (submit-on-Enter/click, not live-as-you-type — matches `CompletedFilters`).
- `src/app/(dashboard)/projects/page.tsx` becomes accepts `searchParams: Promise<{ q?: string }>`,
  and adds `...(q ? { name: { contains: q, mode: "insensitive" } } : {})` to the existing
  `prisma.project.findMany`'s `where` clause.
- Renders `<ProjectFilters />` above the project grid, only when the user has at least one project
  (matches how `TaskFilters`/`CompletedFilters` only render when there's something to filter).
- A new empty state — "No projects match your search." — shown when `projects.length === 0` but a
  query was provided, distinct from the existing "create your first project" empty state (which is
  for having zero projects at all, not zero search matches).

## Testing / verification

- Manual: search for an existing project's name (exact and partial/lowercase match), confirm the
  grid narrows correctly; search for nonsense text, confirm the new empty state; clear the search,
  confirm the full grid returns.
