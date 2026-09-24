# Top-Right Profile Menu Design

**Status:** Approved by user in conversation.

## Goal

A profile icon always visible in the top-right corner of the dashboard shell, on every screen
size, that opens a dropdown with the user's name/email, a link to Settings, and Log out.

## Current state (relevant facts from research)

- `(dashboard)/layout.tsx` has a `<header>` row with the mobile hamburger (`MobileNav`) and the
  "Task Tracker" title, but it's `md:hidden` — there is no top bar at all on desktop today.
- `Sidebar` is a `"use client"` component with no session/user awareness.
- Logout already exists as a working Server Action (`logout` in `src/actions/settings.ts`,
  wrapping Auth.js's `signOut`), currently only exposed via a form button on the Settings page.
- shadcn's `DropdownMenu` is already installed; `Avatar` is not.
- The Settings page re-queries Prisma for fresh `name`/`email` rather than trusting the JWT
  session claims, since editing a name doesn't refresh the session token. The same staleness
  concern applies here since the profile menu is visible on every page, so the same fresh-query
  approach is used rather than reading `session.user.name` directly.

## Design

**Layout change:** `(dashboard)/layout.tsx`'s `<header>` stops being `md:hidden` — it's visible at
all breakpoints. The hamburger + "Task Tracker" title stay wrapped in their own `md:hidden` div
inside it (mobile-only), and the new `ProfileMenu` is added with `ml-auto` so it's pinned to the
right edge of the bar regardless of what else is showing. This keeps the profile icon in the same
physical top-right corner on both mobile and desktop, without duplicating a second bar.

**Data flow:** `(dashboard)/layout.tsx` (already an async server component calling `auth()`) adds
one `prisma.user.findUnique({ where: { id: session.user.id }, select: { name, email, image } })`
call and passes the result as a `user` prop into `<Sidebar user={...} />`, which forwards it to the
new `<ProfileMenu user={...} />`. No new session/auth mechanism — reuses the existing `auth()` +
direct-Prisma-read pattern already established on the Settings page.

**`ProfileMenu` component** (new file, `src/components/layout/profile-menu.tsx`, client component):
- A round `Avatar` button: `AvatarImage` from `user.image` if set (currently always null in
  practice — no upload flow exists — so this is a bonus path, not the primary case), falling back
  to `AvatarFallback` showing initials derived from `name` (first letters of up to two words) or,
  if no name is set, the first letter of `email`.
- `DropdownMenu` opened by clicking the avatar:
  - `DropdownMenuLabel` showing name (or email if no name) and, below it in muted text, the email.
  - `DropdownMenuSeparator`.
  - `DropdownMenuItem` (as a `Link` to `/settings`) — "Settings".
  - `DropdownMenuSeparator`.
  - `DropdownMenuItem` wrapping a `<form action={logout}>` submit button — "Log out". Reuses the
    existing `logout` Server Action directly; no new logout code.

**New dependency:** `npx shadcn@3.8.5 add avatar` (per CLAUDE.md's pinned CLI version), which adds
`src/components/ui/avatar.tsx` and `@radix-ui/react-avatar`.

## Out of scope

- No avatar image upload flow (not requested; `image` stays read-only/bonus).
- No changes to the Settings page itself — it already has its own logout button, which stays.
- No changes to `MobileNav`'s existing hamburger menu contents.

## Testing / verification

- `npx tsc --noEmit`, lint, existing test suite (no existing tests should need changes — this is
  additive UI).
- Manual: profile icon visible top-right on both a wide desktop viewport and a narrow mobile
  viewport; dropdown opens with correct name/email/initials; Settings link navigates correctly;
  Log out actually ends the session and redirects to `/auth/login`.
