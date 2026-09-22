# Project Slug URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Project detail pages are reachable at `/projects/<slug>` (e.g. `/projects/client-website`) instead of `/projects/<cuid>`, with slugs generated once at creation, unique per user, and immutable across renames.

**Architecture:** Add a `slug` column to `Project` in two safe migrations (nullable → backfill → required+unique) rather than one, since a single required-column migration on a non-empty table would need an interactive default-value prompt that can't be scripted. `createProject` generates the slug at creation time using two new pure functions (`slugify`, `ensureUniqueSlug`). The route folder `projects/[id]` becomes `projects/[slug]`; the underlying `Project.id` (cuid) is untouched everywhere else — it's still the real primary key and still what `Task.projectId` references.

**Tech Stack:** Prisma 5 migrations, no new dependencies.

**Design doc:** `docs/superpowers/specs/2026-09-22-project-slug-urls-design.md`

---

### Task 1: Slugify utilities (TDD)

**Files:**
- Create: `src/lib/slugify.ts`
- Test: `src/lib/slugify.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/slugify.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { slugify, ensureUniqueSlug } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Client Website")).toBe("client-website");
  });

  it("collapses runs of whitespace and punctuation into a single hyphen", () => {
    expect(slugify("  Multiple   Spaces!! ")).toBe("multiple-spaces");
  });

  it("strips special characters", () => {
    expect(slugify("Special!@#Chars")).toBe("special-chars");
  });

  it("falls back to 'project' for an empty result", () => {
    expect(slugify("")).toBe("project");
    expect(slugify("😀😀😀")).toBe("project");
  });

  it("leaves an already-slugged string unchanged", () => {
    expect(slugify("already-slugged")).toBe("already-slugged");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns the base slug unchanged when it isn't taken", () => {
    expect(ensureUniqueSlug("client-website", [])).toBe("client-website");
    expect(ensureUniqueSlug("client-website", ["personal-website"])).toBe("client-website");
  });

  it("appends -2 when the base slug is taken", () => {
    expect(ensureUniqueSlug("client-website", ["client-website"])).toBe("client-website-2");
  });

  it("finds the first free numeric suffix", () => {
    expect(
      ensureUniqueSlug("client-website", ["client-website", "client-website-2"])
    ).toBe("client-website-3");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './slugify'`

- [ ] **Step 3: Implement**

`src/lib/slugify.ts`:
```ts
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/slugify.ts src/lib/slugify.test.ts
git commit -m "Add slugify and ensureUniqueSlug utilities"
```

---

### Task 2: Add slug column (nullable)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_project_slug_nullable/migration.sql` (generated)

- [ ] **Step 1: Add the nullable field**

In `prisma/schema.prisma`, add `slug` to the `Project` model, right after `userId`:

```prisma
model Project {
  id          String        @id @default(cuid())
  userId      String
  slug        String?
  name        String
  description String?
  color       String        @default("#6366f1")
  status      ProjectStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  archivedAt  DateTime?

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks      Task[]
  activities Activity[]

  @@index([userId])
}
```

- [ ] **Step 2: Generate the migration without applying it**

```bash
npx prisma migrate dev --create-only --name add_project_slug_nullable
```

`--create-only` writes the migration SQL file without running it, so there's no chance of hitting
an interactive prompt here even if one were possible for this (safe, nullable-column) change.

- [ ] **Step 3: Review the generated SQL**

Open the newly created `prisma/migrations/<timestamp>_add_project_slug_nullable/migration.sql` and
confirm it's a single, simple statement:
```sql
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;
```

- [ ] **Step 4: Apply it**

```bash
npx prisma migrate deploy
```

`migrate deploy` applies pending migrations non-interactively — no prompts possible, unlike
`migrate dev`'s apply step.

- [ ] **Step 5: Verify**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Add nullable slug column to Project"
```

---

### Task 3: Backfill slugs for existing projects

**Files:**
- Create (scratch, not committed): a one-off script outside the repo, e.g. in your scratchpad
  directory — this script is run once and discarded, not part of the codebase

- [ ] **Step 1: Write the backfill script**

Save this as `backfill-project-slugs.ts` in your scratchpad directory (not inside the project —
it's a one-time script, not application code):

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "project";
}

function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) return baseSlug;
  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) counter++;
  return `${baseSlug}-${counter}`;
}

async function main() {
  const projects = await prisma.project.findMany({
    where: { slug: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, userId: true, name: true },
  });

  const assignedSlugsByUser = new Map<string, string[]>();

  for (const project of projects) {
    const existing = assignedSlugsByUser.get(project.userId) ?? [];
    const base = slugify(project.name);
    const slug = ensureUniqueSlug(base, existing);
    await prisma.project.update({ where: { id: project.id }, data: { slug } });
    assignedSlugsByUser.set(project.userId, [...existing, slug]);
    console.log(`${project.name} -> ${slug}`);
  }

  console.log(`Backfilled ${projects.length} project(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

This duplicates `slugify`/`ensureUniqueSlug` inline rather than importing Task 1's versions — it's
a throwaway script, not worth wiring up cross-project import resolution for.

- [ ] **Step 2: Run it from the project root**

```bash
npx tsx /path/to/your/scratchpad/backfill-project-slugs.ts
```

Expected: prints one `<name> -> <slug>` line per existing project, then `Backfilled N project(s).`

- [ ] **Step 3: Verify no nulls remain**

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.project.count({ where: { slug: null } }).then((count) => {
  console.log('projects with null slug:', count);
  return prisma.\$disconnect();
});
"
```

Expected: `projects with null slug: 0`

- [ ] **Step 4: Delete the scratch script**

It served its one-time purpose; there's nothing to commit for this task.

---

### Task 4: Make slug required and unique per user

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_project_slug_required_unique/migration.sql`
  (generated)

- [ ] **Step 1: Tighten the field**

In `prisma/schema.prisma`, change the `Project` model's `slug` field and add the unique
constraint:

```prisma
model Project {
  id          String        @id @default(cuid())
  userId      String
  slug        String
  name        String
  description String?
  color       String        @default("#6366f1")
  status      ProjectStatus @default(ACTIVE)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  archivedAt  DateTime?

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks      Task[]
  activities Activity[]

  @@unique([userId, slug])
  @@index([userId])
}
```

- [ ] **Step 2: Generate the migration without applying it**

```bash
npx prisma migrate dev --create-only --name add_project_slug_required_unique
```

- [ ] **Step 3: Review the generated SQL**

Open `prisma/migrations/<timestamp>_add_project_slug_required_unique/migration.sql` and confirm it
contains an `ALTER COLUMN "slug" SET NOT NULL` and a `CREATE UNIQUE INDEX` on `("userId", "slug")`.
Since Task 3 already backfilled every row, this is safe to apply as generated.

- [ ] **Step 4: Apply it**

```bash
npx prisma migrate deploy
```

- [ ] **Step 5: Verify**

Run: `npx prisma validate && npx tsc --noEmit`
Expected: both succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Make Project.slug required and unique per user"
```

---

### Task 5: Seed script generates real slugs

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Update the seed script**

In `prisma/seed.ts`, add this import at the top (relative import, not the `@/` alias — `tsx`
running this file directly shouldn't be assumed to resolve path aliases):

```ts
import { slugify } from "../src/lib/slugify";
```

Then add a `slug` field to both `prisma.project.create` calls, computed from each project's name:

```ts
const clientWebsite = await prisma.project.create({
  data: {
    userId: user.id,
    slug: slugify("Client Website"),
    name: "Client Website",
    description: "Marketing site redesign for a client.",
    color: "#6366f1",
    status: ProjectStatus.ACTIVE,
    tasks: {
      // ...unchanged...
    },
  },
});
```

```ts
const personalWebsite = await prisma.project.create({
  data: {
    userId: user.id,
    slug: slugify("Personal Website"),
    name: "Personal Website",
    description: "Portfolio and blog.",
    color: "#22c55e",
    status: ProjectStatus.ACTIVE,
    tasks: {
      // ...unchanged...
    },
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "Generate real slugs in the seed script"
```

---

### Task 6: createProject generates a unique slug

**Files:**
- Modify: `src/actions/projects.ts`

- [ ] **Step 1: Update createProject**

In `src/actions/projects.ts`, add the import and update `createProject`'s body:

```ts
import { slugify, ensureUniqueSlug } from "@/lib/slugify";
```

```ts
export async function createProject(input: ProjectInput): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  const baseSlug = slugify(parsed.data.name);
  const existingProjects = await prisma.project.findMany({
    where: { userId, slug: { startsWith: baseSlug } },
    select: { slug: true },
  });
  const slug = ensureUniqueSlug(
    baseSlug,
    existingProjects.map((project) => project.slug)
  );

  await prisma.project.create({
    data: {
      userId,
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      status: parsed.data.status as ProjectStatus,
    },
  });

  revalidatePath("/projects");
  return { success: true };
}
```

`updateProject` is intentionally left unchanged — slugs are immutable once set, per the design
doc, so renaming a project never touches `slug`.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/projects.ts
git commit -m "Generate a unique slug when creating a project"
```

---

### Task 7: Rename the route to use the slug

**Files:**
- Move: `src/app/(dashboard)/projects/[id]/page.tsx` → `src/app/(dashboard)/projects/[slug]/page.tsx`

- [ ] **Step 1: Move the file**

```bash
mkdir -p "src/app/(dashboard)/projects/[slug]"
git mv "src/app/(dashboard)/projects/[id]/page.tsx" "src/app/(dashboard)/projects/[slug]/page.tsx"
rmdir "src/app/(dashboard)/projects/[id]"
```

- [ ] **Step 2: Update the page to look up by slug**

Replace the full contents of `src/app/(dashboard)/projects/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { AddTaskButton } from "@/components/tasks/add-task-button";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import type { TaskListItemData } from "@/components/tasks/task-list-item";
import type { ProjectInput } from "@/lib/validations/project";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const project = await prisma.project.findFirst({
    where: { slug, userId },
    include: {
      tasks: {
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const allProjects = await prisma.project.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const { completedCount, totalCount, percent } = computeProjectProgress(
    project.tasks.map((task) => task.status)
  );

  const taskItems: TaskListItemData[] = project.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    projectId: task.projectId,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description ? (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
          <EditProjectButton
            project={{
              id: project.id,
              name: project.name,
              description: project.description ?? "",
              color: project.color as ProjectInput["color"],
              status: project.status,
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {totalCount === 0
              ? "No tasks yet"
              : `${completedCount}/${totalCount} tasks · ${percent}%`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Tasks</h2>
        <AddTaskButton projects={allProjects} defaultProjectId={project.id} />
      </div>

      {taskItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No tasks yet.</p>
          <AddTaskButton projects={allProjects} defaultProjectId={project.id} label="Add Task" />
        </div>
      ) : (
        <KanbanBoard initialTasks={taskItems} projects={allProjects} />
      )}
    </div>
  );
}
```

Only the `params` type, the destructured variable, and the `findFirst` `where` clause changed
(`id` → `slug`) from the previous version — everything else (header, progress bar, task fetching
shape, Kanban board wiring) is identical to what Phase 3/4 already built.

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds; the route table shows `/projects/[slug]` instead of `/projects/[id]`.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/projects"
git commit -m "Route project detail pages by slug instead of id"
```

---

### Task 8: Pass slug through to project cards

**Files:**
- Modify: `src/app/(dashboard)/projects/page.tsx`
- Modify: `src/components/projects/project-card.tsx`

- [ ] **Step 1: Include slug in the card data**

In `src/app/(dashboard)/projects/page.tsx`, add `slug: project.slug` to the object literal built
for each `ProjectCardData`:

```tsx
  const projectCards: ProjectCardData[] = projects.map((project) => {
    const { completedCount, totalCount, percent } = computeProjectProgress(
      project.tasks.map((task) => task.status)
    );

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description ?? "",
      color: project.color as ProjectInput["color"],
      status: project.status,
      completedCount,
      totalCount,
      percent,
      updatedAtLabel: formatRelativeTime(project.updatedAt),
    };
  });
```

(The Prisma query above this already uses `include`, which returns every scalar column including
the new `slug` — no query change needed, just picking it up in the mapped object.)

- [ ] **Step 2: Add slug to ProjectCardData and use it for links**

In `src/components/projects/project-card.tsx`, add `slug: string` to the `ProjectCardData` type
and change both `Link` elements to use it instead of `project.id`:

```tsx
export type ProjectCardData = ProjectInput & {
  id: string;
  slug: string;
  completedCount: number;
  totalCount: number;
  percent: number;
  updatedAtLabel: string;
};
```

```tsx
          <Link href={`/projects/${project.slug}`} className="font-medium hover:underline">
            {project.name}
          </Link>
```

```tsx
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.slug}`}>Open</Link>
            </DropdownMenuItem>
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds with no type errors (the `ProjectCardData` shape change is caught by
`tsc` if any usage is missed).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/projects/page.tsx" src/components/projects/project-card.tsx
git commit -m "Link project cards by slug"
```

---

### Task 9: Final verification

- [ ] **Step 1: Automated checks**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: all four succeed with no errors.

- [ ] **Step 2: Manual browser walkthrough**

`npm run dev`, log in as the seeded demo user:

1. On `/projects`, confirm both seed project cards link to `/projects/client-website` and
   `/projects/personal-website` (not a cuid) — hover or click through to confirm
2. Create two new projects both named "Test Project" — confirm the first lands at
   `/projects/test-project` and the second at `/projects/test-project-2`
3. Edit one of them, rename it to something else entirely — confirm its URL does **not** change
   (slug immutability)
4. Visit `/projects/<a-slug-that-does-not-exist>` — confirm a 404, not a crash
5. Register a second user, confirm visiting the first user's real slug URL also 404s (cross-user
   isolation still holds)
6. Check the browser console for errors throughout — expect none

- [ ] **Step 3: Clean up test data**

Delete the two "Test Project" projects and the second test user created in Step 2, via the UI or
`npx prisma studio`, so the seeded demo data stays the canonical dev fixture.

- [ ] **Step 4: Update plan status**

Mark all checkboxes in this plan complete once every step above has actually passed.
