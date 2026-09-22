# Phase 12: Settings Page — Design

## Goal

Build out `/settings`, currently a "Coming soon." placeholder, into the four sections the
spec's "Admin / Management" section calls for: Profile, Theme, Account, and Data management.
This is scoped as the concrete, well-defined half of Phase 12 ("Polish UI and optimize
performance") — a general UI polish sweep and the color/warmth redesign are separate
sub-projects with their own design passes.

## 1. Profile section

- Edit `User.name` via a simple text input + Save button.
- `User.email` is shown read-only (plain text, not an input) — it's the Credentials provider's
  login identifier, and changing it is out of scope for this phase (decided during brainstorming:
  simpler, avoids re-verification edge cases).
- Server Action: `updateProfile(name: string)` in `src/actions/settings.ts`, scoped by the
  session's `userId`, following the same `requireUserId()` + Zod-validated-input pattern as
  every other Server Action in this codebase.

## 2. Theme section

- A `Select` (Light / Dark / System) backed by `next-themes`' `useTheme()` hook — the same
  mechanism the existing sidebar `ThemeToggle` dropdown already uses. This is a second, more
  discoverable control for the same preference, not a new preference-storage mechanism;
  `next-themes` already persists the choice to `localStorage` and both controls read/write the
  same value.
- The existing sidebar `ThemeToggle` is unchanged.

## 3. Account section

- **Change password**: a form with Current Password, New Password, and Confirm New Password
  fields (React Hook Form + Zod, matching every other form in this codebase). A new Zod schema
  validates that New Password and Confirm New Password match and that the new password meets the
  same minimum-length rule already enforced at registration.
- Server Action: `changePassword(currentPassword: string, newPassword: string)` in
  `src/actions/settings.ts`. It re-fetches the user's stored password hash, verifies
  `currentPassword` against it with the existing `verifyPassword` helper
  (`src/lib/auth/password.ts`), and — only if that succeeds — hashes `newPassword` with the
  existing `hashPassword` helper and updates the `User` row. No new hashing/crypto code.
- **Log out**: a button calling `next-auth`'s `signOut()`, redirecting to `/auth/login`. (Noted
  during brainstorming: there is currently no logout control anywhere in the app — this closes
  that gap, and the same `signOut()` call is reused by the Delete Account flow below.)

## 4. Data management section

- **Export Data**: a single "Export Data" button. A Server Action `exportUserData()` in
  `src/actions/settings.ts` returns `{ projects, tasks, activities }` — all three of the current
  user's own rows (via the same `userId`-scoped `where` clauses used everywhere else), serialized
  as-is (Prisma's native shapes, dates as ISO strings once JSON-serialized). A small Client
  Component (`ExportDataButton`) calls the action, then builds a `Blob` from
  `JSON.stringify(result, null, 2)` and triggers a download via a temporary
  `URL.createObjectURL` anchor click — no new library, no route handler. Scoped to JSON only per
  the brainstorming decision (CSV would require three separate files with three different column
  shapes — deferred as unnecessary complexity for a personal-data-portability nicety).
- **Delete Account**: a "Delete Account" button opens an `AlertDialog`, styled and structured
  identically to the existing `DeleteTaskDialog` pattern (same title/description/Cancel/Delete
  button shape, same disabled-while-pending behavior). Confirming calls a `deleteAccount()`
  Server Action that deletes the `User` row — cascading to all of that user's Projects, Tasks, and
  Activity via the `onDelete: Cascade` foreign keys already in the schema — then calls `signOut()`
  and redirects to `/auth/login`.

## Files touched

- Create: `src/actions/settings.ts` (`updateProfile`, `changePassword`, `exportUserData`,
  `deleteAccount`)
- Create: `src/lib/validations/settings.ts` (Zod schemas for the profile-name form and the
  change-password form)
- Create: `src/components/settings/profile-form.tsx`
- Create: `src/components/settings/theme-select.tsx`
- Create: `src/components/settings/password-form.tsx`
- Create: `src/components/settings/logout-button.tsx`
- Create: `src/components/settings/export-data-button.tsx`
- Create: `src/components/settings/delete-account-dialog.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx` (full rewrite, assembling the four sections;
  fetches the current user's `name`/`email` for the Profile section)

## Testing

No new pure-logic helper functions are introduced (the Zod schemas are declarative, not logic to
unit-test on their own, consistent with how the rest of this codebase's validation schemas are
handled). Verification is manual browser testing: update the profile name, switch themes via the
new Settings control, change the password and confirm re-login works with the new one, export
data and confirm the downloaded JSON's shape, and — last, since it's destructive — delete a
disposable test account and confirm it's fully gone and the session ends.
