# Loading States & Performance — Design

## Goal

Add a visible, animated loading indicator on every page navigation (per explicit user request:
"it should be like an animated loading icon or loading screen"), and fix one concrete correctness
bug found while investigating perceived navigation slowness.

## Investigation summary

The user's complaint was that navigating between pages "takes time to load" and should feel
"instant." Investigation (via Navigation Timing API measurements in the browser, and dev-server
log inspection) found:

- In `npm run dev` (Turbopack dev mode), navigations measured 700ms–2.5s TTFB (time to first
  byte) — but a large share of that is one-time, per-route on-demand compilation
  (`✓ Compiled /today in 843ms`), which is a dev-only cost that doesn't exist in production.
- A real production build (`next build && next start`), same machine, same database, same
  network path, measured 240–560ms TTFB, settling around 240–360ms once the connection pool was
  warm.
- That residual ~250–350ms is the genuine cost of a Server Component making a network round trip
  to a remote database (Neon) plus session/JWT decode plus render — not a code-level inefficiency
  to chase further. It's expected to be equal or better on actual Vercel infrastructure, which
  typically has a better network path to major cloud database regions than a home dev connection.
- The Prisma client is already a correct singleton (`src/lib/db.ts` reuses `globalThis.prisma`),
  ruling out the classic "new connection per request" bug.
- Data fetching on every page already uses parallel `Promise.all` queries from earlier phases —
  no N+1 patterns found.

**Conclusion**: there's no deep architectural fix to make here. The two things worth doing are (1)
give navigation instant visual feedback so the unavoidable ~250–350ms network wait never feels
frozen, and (2) fix one genuine (if currently harmless) bug found along the way.

## 1. Shared `PageLoading` spinner component

`src/components/ui/page-loading.tsx` — a small, dependency-free component: Lucide's `Loader2`
icon with Tailwind's `animate-spin`, centered in whatever container it's placed in.

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

## 2. `loading.tsx` on every route segment

Next.js's App Router shows a route segment's `loading.tsx` automatically while that segment's
Server Component is fetching data — critically, it can be shown *immediately* on navigation
(from a prefetched static shell), with the real content streamed in once the data resolves. This
is the built-in, zero-dependency mechanism for exactly the "instant-feeling navigation" the user
asked about; no client-side routing library or custom spinner-on-click logic is needed.

Added to every route that currently has a `page.tsx` under `(dashboard)`:
`src/app/(dashboard)/loading.tsx` (covers `/`), `.../projects/loading.tsx`,
`.../projects/[slug]/loading.tsx`, `.../today/loading.tsx`, `.../upcoming/loading.tsx`,
`.../completed/loading.tsx`, `.../settings/loading.tsx`. Each file is the same two lines:

```tsx
import { PageLoading } from "@/components/ui/page-loading";

export default function Loading() {
  return <PageLoading />;
}
```

Because `loading.tsx` lives inside the `(dashboard)` route group, only the `<main>` content area
it wraps re-renders as loading — the `Sidebar`/`MobileNav` (rendered by the shared
`(dashboard)/layout.tsx`, one level up) stay mounted, visible, and interactive throughout every
navigation.

## 3. Fix `revalidatePath` to use the project slug, not its id

Every task/project mutation in `src/actions/tasks.ts` and `src/actions/projects.ts` calls
`revalidatePath(`/projects/${projectId}`)` — but the actual route is `/projects/[slug]`
(e.g. `/projects/client-website`), not `/projects/[id]`. This revalidation call has never matched
a real cached path. It's been invisible because every page under `(dashboard)` is already
force-dynamic (each one calls `auth()`, which reads cookies and opts the route out of the Next.js
Route Cache entirely) — so pages already re-fetch fresh data on every request regardless of this
call. It's dead code, not a user-visible bug, but worth fixing now: `updateTaskStatus` and
`updateTask` already have the task's project loaded (or can cheaply select the project's `slug`
alongside data already being fetched), so the fix is passing the correct identifier through
instead of the raw `projectId`.

## Files touched

- Create: `src/components/ui/page-loading.tsx`
- Create: `src/app/(dashboard)/loading.tsx`
- Create: `src/app/(dashboard)/projects/loading.tsx`
- Create: `src/app/(dashboard)/projects/[slug]/loading.tsx`
- Create: `src/app/(dashboard)/today/loading.tsx`
- Create: `src/app/(dashboard)/upcoming/loading.tsx`
- Create: `src/app/(dashboard)/completed/loading.tsx`
- Create: `src/app/(dashboard)/settings/loading.tsx`
- Modify: `src/actions/tasks.ts` (`createTask`, `updateTask`, `updateTaskStatus`, `deleteTask` —
  revalidate by slug)
- Modify: `src/actions/projects.ts` (no change expected — its `revalidatePath("/projects")` calls
  are already correct; verified during planning, not assumed)

## Testing

No new pure-logic functions. Verification is manual: throttle the network in DevTools (or rely on
the already-measured ~250–350ms production latency) and confirm the spinner appears immediately
on every route change and swaps to real content once loaded, confirm the Sidebar stays interactive
during a pending navigation, and confirm task/project mutations still correctly refresh the
Project Detail page's content (proving the `revalidatePath` fix didn't regress anything — it was
already masked by force-dynamic rendering either way, so this is a smoke test, not a bug-reproduction
test).
