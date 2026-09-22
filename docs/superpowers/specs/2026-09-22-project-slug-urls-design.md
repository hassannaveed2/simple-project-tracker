# Project Slug URLs — Design

A follow-up to Phase 2 (Projects CRUD, `docs/superpowers/specs/2026-09-21-phase2-projects-crud-design.md`)
and Phase 3/4 (project detail page). Not one of `prompt.md`'s numbered phases — a UX fix requested
directly: `/projects/<cuid>` is unreadable; project detail URLs should read `/projects/<slug>`.

## Goal

Visiting a project shows a URL like `/projects/client-website` instead of
`/projects/cmub3tv6j000213gbfvu77wkh`. Everything else about routing/auth/ownership scoping stays
exactly as Phase 2–4 already built it.

## Decisions

- **Slug format**: lowercase; any run of non-alphanumeric characters (spaces, punctuation,
  emoji, etc.) collapses to a single hyphen; leading/trailing hyphens trimmed. Falls back to the
  literal string `"project"` if that produces an empty result (e.g. a name that's entirely emoji).
  Pure, testable function — no library needed for something this small.
- **Per-user uniqueness, not global**: `@@unique([userId, slug])`. Two different users can each
  have a project slugged `website` with zero conflict — consistent with every other ownership
  boundary already in this codebase.
- **Immutable once set**: generated once at creation from the project's name at that moment;
  renaming the project later does *not* regenerate the slug. This matches how GitHub repo URLs,
  Notion pages, etc. behave, and avoids a link-rot problem a "keep slug in sync with name" design
  would create (someone bookmarks or shares `/projects/client-website`, then the project gets
  renamed, and the link should keep working).
- **Collision suffix**: if a user already has a project whose slug matches the new one, append
  `-2`, `-3`, etc. — first free suffix wins. Pure, testable function taking the candidate slug and
  the user's existing slugs, independent of the database.
- **Migration in two safe steps, not one:** adding `slug` as a single required+unique column in
  one migration would force Prisma to prompt interactively for how to backfill the two existing
  seed projects' rows — not something that can be scripted safely non-interactively. Instead:
  1. Add `slug String?` (nullable) — safe schema change, no backfill needed for a nullable column.
  2. Backfill existing rows via a one-off script using the same slugify + collision-suffix logic
     the app itself uses (so seed data slugs are generated exactly the way real usage would
     generate them).
  3. Tighten the column to `slug String` (required) + `@@unique([userId, slug])` — safe now
     because every row already has a value.
- **The underlying `id` (cuid) doesn't change or disappear.** It's still the actual primary key,
  still what `Task.projectId` references, still what every Server Action uses internally. The slug
  is purely a URL-facing alias resolved once per page load; nothing about the data model's
  relationships changes.

## Scope

In scope:
- `prisma/schema.prisma`: add `slug` to `Project` (nullable → migration → backfill → required +
  unique, per above)
- `src/lib/slugify.ts` (+ test): the two pure functions (`slugify`, `ensureUniqueSlug`)
- `prisma/seed.ts`: seeded projects get real slugs (via the same `slugify` function, for
  consistency with what the app generates at runtime)
- `src/actions/projects.ts`: `createProject` generates and assigns a unique slug
- `src/app/(dashboard)/projects/[id]/` → renamed to `.../projects/[slug]/`, page updated to look
  up by `{ slug, userId }`
- `src/app/(dashboard)/projects/page.tsx`: Prisma query selects `slug`; passes it through to cards
- `src/components/projects/project-card.tsx`: title link and "Open" menu item use `project.slug`

Out of scope: changing `updateProject` to ever touch `slug` (immutability, per above); any change
to how `Task.projectId` or any other foreign key works; a redirect system for stale slugs (not
needed since slugs never change once set).

## Verification

- `npm run build`, `npx tsc --noEmit`, `npm test` all pass
- After migration + backfill, both seed projects have real slugs (`client-website`,
  `personal-website` or similar) with no `null` slugs remaining
- Manual (real browser): `/projects` cards link to `/projects/<slug>`, not a cuid; visiting a
  project shows the correct data; creating a new project with a name matching an existing one's
  slug produces a `-2` suffix, verified by creating two projects both named "Test Project" and
  confirming their URLs are `/projects/test-project` and `/projects/test-project-2`; renaming a
  project afterward does not change its URL; visiting a slug that doesn't belong to the current
  user still 404s (cross-user isolation preserved)
