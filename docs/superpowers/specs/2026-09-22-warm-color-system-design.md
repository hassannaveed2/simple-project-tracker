# Warm Color System — Design

## Goal

Replace the app's current pure-grayscale theme (every shadcn CSS token uses `oklch(X 0 0)` — zero
color chroma, i.e. literal black/white/gray, except the existing red `--destructive` token) with a
warm, "lively but calm" palette, per explicit user request and research into how comparable
productivity/dashboard products (Linear, Notion, Todoist, Stripe, Vercel, and 2026 SaaS color
trend data) use color.

## Research summary

The dominant pattern across every researched brand is a 60/30/10 split: ~60% neutral, ~30% a
secondary tone, ~10% one saturated "brand" accent reserved for CTAs/links/active states — never
color splashed everywhere. This matches the spec's own `UI Design` guardrails ("Avoid: ...
Overly colorful UI... The application should feel calm and productive").

- **Linear**: near-monochromatic UI, one indigo accent (`#7170ff`/`#828fff`).
- **Notion**: almost entirely grayscale; one saturated blue (`#0075de`) for every CTA/link.
- **Todoist** (most relevant technique): the entire neutral scale is *warm-tinted* near-black ink
  (`#25221e`, leaning olive-brown, not blue-gray) rather than true black — warmth lives in the
  neutrals themselves, not just the accent — plus a red accent (`#e34432`).
- **Stripe**: a "blurple" accent on an otherwise neutral base.
- **Vercel**: stark black/white; color appears only in decorative gradients, never in UI chrome.
- **2026 SaaS trend data**: a "Warm Analytics" orange/amber scale
  (`#fff7ed → #ffedd5 → #fdba74 → #f97316 → #9a3412`) is increasingly preferred over red because it
  reads as *inviting* rather than *alarming*.

## 1. Warm accent color

Replace `--primary`/`--primary-foreground` (and the tokens that visually key off it — `--ring`,
`--sidebar-primary`/`--sidebar-primary-foreground`, `--sidebar-ring`) with a warm
terracotta/burnt-orange, targeting:

- Light mode: primary ≈ `#c2410c` (a deep warm terracotta/orange) with white/near-white
  `--primary-foreground` text.
- Dark mode: primary ≈ a lighter warm orange (`#fb923c`–`#fdba74` range) with dark
  `--primary-foreground` text — mirroring how this theme already flips light-primary/dark-text
  between light and dark mode (see the current `.dark { --primary: oklch(0.922 0 0); }`, a light
  token with dark text on top).

`--destructive` (currently red, for delete actions) stays unchanged — the new accent must stay
visually distinct from it so "primary action" and "destructive action" don't get confused.

Exact OKLCH values (this app's tokens are all defined in OKLCH, e.g.
`--primary: oklch(0.205 0 0);`) and WCAG AA contrast verification (4.5:1 minimum for button/badge
text against its background) are computed and checked during implementation — this design fixes
the target hex references above, not final numeric values.

## 2. Warm-tinted neutrals

Every neutral token (`--background`, `--card`, `--popover`, `--secondary`, `--muted`, `--accent`,
`--border`, `--input`, `--sidebar`, `--sidebar-accent`, `--sidebar-border`, and their `.dark`
counterparts) currently has zero chroma. Each gets a very small warm chroma nudge (roughly
0.004–0.012 OKLCH chroma at a warm hue, ~50–70°) while **keeping today's lightness values
unchanged**, so existing contrast ratios and the visual spacing/hierarchy the app already has
don't shift — only the color cast does, from clinical gray to warm "paper." This is the Todoist
technique: warmth in the base neutrals, not only in the accent.

`--chart-1` through `--chart-5` are left as-is (currently unused anywhere in the codebase — no
chart component exists yet, so there's nothing to visually verify against).

## 3. Color-coded priority badges

Currently, every task priority (`LOW`/`MEDIUM`/`HIGH`/`URGENT`) renders as the same neutral
outline `Badge` — in `src/components/tasks/task-list-item.tsx` and
`src/components/dashboard/upcoming-task-row.tsx`, each of which independently duplicates its own
`PRIORITY_LABELS` map today (consistent with this codebase's convention of duplicating small label
maps per file — see `task-form-sheet.tsx`'s identical duplication). Duplicated color logic is a
real drift risk in a way duplicated label strings aren't (a future edit to one file's colors could
silently diverge from the other), so this is extracted once:

- New: `src/lib/priority-styles.ts` exporting `PRIORITY_LABELS` and `PRIORITY_BADGE_CLASSES`
  (a `Record<TaskPriority, string>` of Tailwind classes), used by both call sites in place of
  their local duplicate maps.
- Color ramp (a standard "soft badge" pattern — light tint background + matching-hue dark text,
  both light- and dark-mode aware, using Tailwind's built-in color palette rather than new
  `globals.css` tokens):
  - `LOW` → slate (cool, calm — distinct from "no priority set")
  - `MEDIUM` → amber
  - `HIGH` → orange (the same family as the new primary accent, one step more intense than Medium)
  - `URGENT` → red (the existing destructive-red family)

## Files touched

- Modify: `src/app/globals.css` (`--primary`/`--primary-foreground`/`--ring`/`--sidebar-primary`/
  `--sidebar-primary-foreground`/`--sidebar-ring` in both `:root` and `.dark`; warm-tint every
  neutral token listed above in both blocks)
- Create: `src/lib/priority-styles.ts`
- Modify: `src/components/tasks/task-list-item.tsx` (use the shared priority styles instead of its
  local `PRIORITY_LABELS` map + plain `variant="outline"` badge)
- Modify: `src/components/dashboard/upcoming-task-row.tsx` (same)

## Testing

No new pure-logic functions are introduced (`priority-styles.ts` is a declarative lookup map, not
logic to unit test, consistent with how this codebase treats other declarative label maps).
Verification is manual and visual: check every page in both light and dark mode for the new accent
color and warm neutral cast, confirm buttons/links/focus rings/active nav state pick up the new
accent, confirm the four priority badge colors render distinctly and match across both call sites,
and spot-check text contrast (badge text on its background, button text on the new primary) reads
clearly in both themes.
