# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an authenticated Next.js 15 app shell (sidebar nav, placeholder pages, dark/light/system theme, responsive mobile nav) backed by a real Neon Postgres schema, with email/password auth and a seed script — no Projects/Tasks CRUD yet (that's Phase 2+).

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui, Prisma 5 talking to Neon Postgres, Auth.js v5 Credentials provider with JWT sessions (no adapter — see design doc). Auth config is split into an edge-safe `auth.config.ts` (used by middleware) and a full `auth.ts` (used by route handlers/server components, the only place that touches Prisma) so Prisma is never loaded into the Edge runtime. Server Actions handle mutations; Zod validates on both client (via React Hook Form) and server.

**Tech Stack:** Next.js 15.x, TypeScript, Tailwind CSS, shadcn/ui, Prisma 5.x + `@prisma/client` 5.x, Neon Postgres, Auth.js v5 (`next-auth@beta`), `bcryptjs`, Zod, React Hook Form + `@hookform/resolvers`, `next-themes`, Sonner, Lucide React, Vitest.

**Design doc:** `docs/superpowers/specs/2026-09-21-phase1-foundation-design.md`

---

### Task 1: Scaffold the Next.js app

The project directory already contains `prompt.md`, `CLAUDE.md`, `docs/`, and `.git` — `create-next-app` refuses to run in a non-empty directory, so scaffold into a temp directory and merge.

**Files:**
- Create: everything `create-next-app` generates (`package.json`, `src/app/*`, `tsconfig.json`, `next.config.ts`, `.gitignore`, etc.)

- [ ] **Step 1: Scaffold into a temp directory**

```bash
SCAFFOLD_DIR=$(mktemp -d)
npx create-next-app@15 "$SCAFFOLD_DIR" --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm
```

If prompted about anything not covered by the flags (e.g. Turbopack for `next dev`), accept the default by pressing Enter.

- [ ] **Step 2: Merge the scaffold into the project root**

```bash
rm -rf "$SCAFFOLD_DIR/.git"
cp -a "$SCAFFOLD_DIR"/. .
rm -rf "$SCAFFOLD_DIR"
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build completes successfully, ending with a route summary table (the default `/` page).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js 15 app"
```

---

### Task 2: Set up Vitest for unit tests

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test`/`test:watch` scripts)

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 2: Create the config**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 3: Add scripts**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: exits 0 (no test files yet, `passWithNoTests` allows this).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "Add Vitest for unit tests"
```

---

### Task 3: Initialize shadcn/ui and add base components

**Files:**
- Create: `components.json`, `src/components/ui/{button,input,label,form,sheet,dropdown-menu,sonner}.tsx`, `src/lib/utils.ts`

- [ ] **Step 1: Init shadcn/ui**

Use `shadcn@3.8.5`, not `@latest`: the current `shadcn@latest` (4.x) defaults to a new
"Base UI"-backed `base-nova` style whose `form` registry entry ships with no files yet (silently
no-ops on `add form`). `3.8.5` is the last release before that rearchitecture — classic `new-york`
style, full Radix-based component set, `form.tsx` included.

```bash
npx shadcn@3.8.5 init -d
```

- [ ] **Step 2: Install form and toast dependencies explicitly**

```bash
npm install react-hook-form zod @hookform/resolvers next-themes
```

shadcn's generated `sonner.tsx` wrapper imports `next-themes` (to sync toast theme with app theme),
so it must already be installed before Step 3 adds that component — even though the theme
*provider* itself isn't wired up until Task 14.

- [ ] **Step 3: Add the components this phase needs**

```bash
npx shadcn@3.8.5 add button input label form sheet dropdown-menu sonner --yes
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build still succeeds; `src/components/ui/` now contains the added components.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Initialize shadcn/ui and add base components"
```

---

### Task 4: Add Prisma and define the schema

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json` (add `postinstall` script)
- Modify: `.gitignore` (ensure `.env` is ignored)

- [ ] **Step 1: Install Prisma 5**

```bash
npm install -D prisma@5
npm install @prisma/client@5
```

- [ ] **Step 1a: Create `prisma/schema.prisma` and `.env` by hand (do not run `prisma init`)**

On Node.js 25.x, `prisma@5.22.0`'s `init` command crashes (`Error: (0 , CSe.isError) is not a
function`) — it's a bug in `init`'s CLI-update-check network call specifically, not in Prisma
itself: `prisma format`, `validate`, `generate`, and `migrate dev` all work fine on this Node
version once the schema and `.env` exist. `init` only automates creating those two files, so
create them directly instead:

```bash
mkdir -p prisma
touch prisma/schema.prisma
echo 'DATABASE_URL="postgresql://placeholder"' > .env
grep -qxF '.env' .gitignore || echo '.env' >> .gitignore
```

- [ ] **Step 2: Add a placeholder `DIRECT_URL`**

```bash
echo 'DIRECT_URL="postgresql://placeholder"' >> .env
```

The schema below references both `DATABASE_URL` and `DIRECT_URL`. Prisma's CLI errors on a
completely undefined env var (not just an unreachable one), so `DIRECT_URL` needs *some* value for
`prisma validate` in Step 5 to pass, even before Task 5 supplies the real Neon URLs.

- [ ] **Step 3: Replace `prisma/schema.prisma` with the full schema**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  password  String
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects   Project[]
  tasks      Task[]
  activities Activity[]
}

enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}

model Project {
  id          String        @id @default(cuid())
  userId      String
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

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Task {
  id          String       @id @default(cuid())
  projectId   String
  userId      String
  title       String
  description String?
  notes       String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  project    Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  activities Activity[]

  @@index([userId])
  @@index([projectId])
  @@index([status])
  @@index([priority])
  @@index([dueDate])
}

model Activity {
  id        String   @id @default(cuid())
  userId    String
  projectId String?
  taskId    String?
  type      String
  metadata  Json?
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task    Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
}
```

Note: `User.password` is an addition beyond the fields literally listed in `prompt.md` — it's required to support email/password auth, which the spec explicitly asks for. `Activity.type` is a plain `String` rather than an enum so new lightweight event types don't require a migration.

- [ ] **Step 4: Add `postinstall` so Vercel generates the client on deploy**

In `package.json`, add to `"scripts"`:
```json
"postinstall": "prisma generate"
```

- [ ] **Step 5: Validate the schema**

Run: `npx prisma format && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀` (this only checks syntax — no DB connection needed yet).

- [ ] **Step 6: Commit**

```bash
git add prisma package.json .gitignore
git commit -m "Add Prisma schema for User, Project, Task, Activity"
```

---

### Task 5: Connect to Neon (manual step)

This task requires you (not the agent) to create a Neon project.

- [ ] **Step 1: Create a Neon project**

Go to https://console.neon.tech, create a project (any region/name). Neon gives you a pooled connection string and a direct one.

- [ ] **Step 2: Write `.env.example`**

`.env.example`:
```bash
# Neon Postgres — pooled connection (used by the app at runtime)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
# Neon Postgres — direct connection (used by Prisma Migrate)
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

AUTH_SECRET="generate-with-npx-auth-secret"
AUTH_URL="http://localhost:3000"

# Optional — only needed if Google OAuth is added later
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
```

- [ ] **Step 3: Fill in your real `.env`**

Edit `.env` (created by hand in Task 4, already gitignored) with your actual Neon `DATABASE_URL`
and `DIRECT_URL` — replacing the `postgresql://placeholder` values — plus:

```bash
npx auth secret
```

This generates `AUTH_SECRET` and appends it to `.env` automatically. Add `AUTH_URL="http://localhost:3000"` manually.

- [ ] **Step 4: Commit `.env.example`**

`.gitignore`'s `.env*` pattern also matches `.env.example` — add a negation so the template stays
tracked while real `.env` files stay ignored:

```bash
grep -qxF '!.env.example' .gitignore || echo '!.env.example' >> .gitignore
git add .gitignore .env.example
git commit -m "Add .env.example"
```

**Tell the agent once `.env` has real Neon credentials in it, so Task 6 can run a real migration.**

---

### Task 6: Run the initial migration and add the Prisma client singleton

**Files:**
- Create: `src/lib/db.ts`, `prisma/migrations/**` (generated)

- [ ] **Step 1: Run the migration**

```bash
npx prisma migrate dev --name init
```

Expected: creates `prisma/migrations/<timestamp>_init/`, applies it to Neon, regenerates the client, prints `Your database is now in sync with your schema.`

- [ ] **Step 2: Create the Prisma client singleton**

`src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations src/lib/db.ts
git commit -m "Run initial Prisma migration, add Prisma client singleton"
```

---

### Task 7: Password hashing utility (TDD)

**Files:**
- Create: `src/lib/auth/password.ts`
- Test: `src/lib/auth/password.test.ts`

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Write the failing test**

`src/lib/auth/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (salted)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './password'`

- [ ] **Step 4: Implement**

`src/lib/auth/password.ts`:
```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/password.ts src/lib/auth/password.test.ts package.json package-lock.json
git commit -m "Add password hashing utility"
```

---

### Task 8: Auth validation schemas (TDD)

**Files:**
- Create: `src/lib/validations/auth.ts`
- Test: `src/lib/validations/auth.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/validations/auth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Jack",
      email: "jack@example.com",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Jack",
      email: "not-an-email",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Jack",
      email: "jack@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("allows an empty name", () => {
    const result = registerSchema.safeParse({
      email: "jack@example.com",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "jack@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "jack@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './auth'`

- [ ] **Step 3: Implement**

`src/lib/validations/auth.ts`:
```ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/auth.ts src/lib/validations/auth.test.ts
git commit -m "Add auth validation schemas"
```

---

### Task 9: Auth.js configuration (TDD for the credential-checking logic)

The credential-checking logic is extracted into a standalone `authenticateUser` function so it can be unit tested with a fake `findUserByEmail`, instead of mocking Prisma.

**Files:**
- Create: `src/lib/auth/authenticate-user.ts`
- Test: `src/lib/auth/authenticate-user.test.ts`
- Create: `src/lib/auth.config.ts` (edge-safe config, no Prisma import)
- Create: `src/lib/auth.ts` (full config — the only file that imports Prisma for auth)
- Create: `src/types/next-auth.d.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install Auth.js v5**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Write the failing test**

`src/lib/auth/authenticate-user.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { authenticateUser } from "./authenticate-user";
import { hashPassword } from "./password";

describe("authenticateUser", () => {
  it("returns the user when credentials are valid", async () => {
    const hash = await hashPassword("supersecret1");
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user_1",
      email: "jack@example.com",
      name: "Jack",
      password: hash,
    });

    const result = await authenticateUser(
      { email: "jack@example.com", password: "supersecret1" },
      findUserByEmail
    );

    expect(result).toEqual({ id: "user_1", email: "jack@example.com", name: "Jack" });
  });

  it("returns null when the user does not exist", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);

    const result = await authenticateUser(
      { email: "ghost@example.com", password: "whatever1" },
      findUserByEmail
    );

    expect(result).toBeNull();
  });

  it("returns null when the password is wrong", async () => {
    const hash = await hashPassword("supersecret1");
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user_1",
      email: "jack@example.com",
      name: "Jack",
      password: hash,
    });

    const result = await authenticateUser(
      { email: "jack@example.com", password: "wrong-password" },
      findUserByEmail
    );

    expect(result).toBeNull();
  });

  it("returns null when credentials fail schema validation, without querying", async () => {
    const findUserByEmail = vi.fn();

    const result = await authenticateUser({ email: "not-an-email" }, findUserByEmail);

    expect(result).toBeNull();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './authenticate-user'`

- [ ] **Step 4: Implement**

`src/lib/auth/authenticate-user.ts`:
```ts
import { verifyPassword } from "./password";
import { loginSchema } from "../validations/auth";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type UserRecord = AuthUser & { password: string };

export async function authenticateUser(
  credentials: Record<string, unknown>,
  findUserByEmail: (email: string) => Promise<UserRecord | null>
): Promise<AuthUser | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await findUserByEmail(parsed.data.email);
  if (!user) return null;

  const isValid = await verifyPassword(parsed.data.password, user.password);
  if (!isValid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests)

- [ ] **Step 6: Create the edge-safe auth config**

`src/lib/auth.config.ts`:
```ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: { signIn: "/auth/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuthPage = request.nextUrl.pathname.startsWith("/auth");
      if (isOnAuthPage) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
```

This file must never import `@/lib/db` (Prisma) — it's loaded by middleware, which runs on the Edge runtime where Prisma 5's client cannot run.

- [ ] **Step 7: Create the full auth config**

`src/lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { authenticateUser } from "@/lib/auth/authenticate-user";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) =>
        authenticateUser(credentials, (email) =>
          prisma.user.findUnique({ where: { email } })
        ),
    }),
  ],
});
```

- [ ] **Step 8: Add session type augmentation**

`src/types/next-auth.d.ts`:
```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
```

- [ ] **Step 9: Add the route handler**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors, all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/lib/auth src/lib/auth.ts src/lib/auth.config.ts src/types/next-auth.d.ts src/app/api/auth package.json package-lock.json
git commit -m "Add Auth.js v5 configuration with Credentials provider"
```

---

### Task 10: Middleware route protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create the middleware**

`src/middleware.ts`:
```ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

This instantiates a second, edge-safe `NextAuth` using only `authConfig` (no Credentials provider, no Prisma) — it can only read/verify the JWT session cookie, which is all middleware needs to decide whether to redirect.

- [ ] **Step 2: Verify**

Run: `npm run build`
Expected: build succeeds with no Edge runtime warnings about Prisma.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "Add middleware route protection"
```

---

### Task 11: Register page

**Files:**
- Create: `src/actions/auth.ts`
- Create: `src/components/auth/register-form.tsx`
- Create: `src/app/auth/register/page.tsx`

- [ ] **Step 1: Add the register server action**

`src/actions/auth.ts`:
```ts
"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export type RegisterResult = { success: true } | { success: false; error: string };

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const hashed = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name || null,
      email: parsed.data.email,
      password: hashed,
    },
  });

  return { success: true };
}
```

- [ ] **Step 2: Add the register form**

`src/components/auth/register-form.tsx`:
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerUser } from "@/actions/auth";

export function RegisterForm() {
  const router = useRouter();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    const result = await registerUser(values);
    if (result.success) {
      toast.success("Account created — please log in.");
      router.push("/auth/login");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Jack" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 3: Add the register page**

`src/app/auth/register/page.tsx`:
```tsx
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Start tracking your projects and tasks.
          </p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds, `/auth/register` listed in the route table.

Manual check: `npm run dev`, visit `http://localhost:3000/auth/register`, submit the form, confirm a success toast and redirect to `/auth/login`, and confirm the user row exists (`npx prisma studio`).

- [ ] **Step 5: Commit**

```bash
git add src/actions/auth.ts src/components/auth/register-form.tsx src/app/auth/register
git commit -m "Add register page"
```

---

### Task 12: Login page

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/app/auth/login/page.tsx`

- [ ] **Step 1: Add the login form**

`src/components/auth/login-form.tsx`:
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const router = useRouter();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    const result = await signIn("credentials", { ...values, redirect: false });
    if (result?.error) {
      toast.error("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Add the login page**

`src/app/auth/login/page.tsx`:
```tsx
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Log in to your account.</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds.

Manual check: `npm run dev`, log in with the account created in Task 11, confirm redirect to `/` and no console errors. Visit `/today` while logged out (use an incognito window) and confirm middleware redirects to `/auth/login`.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/login-form.tsx src/app/auth/login
git commit -m "Add login page"
```

---

### Task 13: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` config)

- [ ] **Step 1: Install tsx**

```bash
npm install -D tsx
```

- [ ] **Step 2: Write the seed script**

`prisma/seed.ts`:
```ts
import { PrismaClient, TaskPriority, TaskStatus, ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Jack",
      password: passwordHash,
    },
  });

  const clientWebsite = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Client Website",
      description: "Marketing site redesign for a client.",
      color: "#6366f1",
      status: ProjectStatus.ACTIVE,
      tasks: {
        create: [
          {
            userId: user.id,
            title: "Fix homepage header",
            status: TaskStatus.TODO,
            priority: TaskPriority.HIGH,
            dueDate: new Date(),
          },
          {
            userId: user.id,
            title: "Replace hero image",
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
          },
          {
            userId: user.id,
            title: "Add contact form",
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.MEDIUM,
          },
          {
            userId: user.id,
            title: "Deploy to staging",
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.LOW,
            completedAt: new Date(),
          },
        ],
      },
    },
  });

  const personalWebsite = await prisma.project.create({
    data: {
      userId: user.id,
      name: "Personal Website",
      description: "Portfolio and blog.",
      color: "#22c55e",
      status: ProjectStatus.ACTIVE,
      tasks: {
        create: [
          {
            userId: user.id,
            title: "Add portfolio section",
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
          },
          {
            userId: user.id,
            title: "Update About page",
            status: TaskStatus.TODO,
            priority: TaskPriority.LOW,
          },
        ],
      },
    },
  });

  console.log(
    `Seeded user ${user.email} with projects: ${clientWebsite.name}, ${personalWebsite.name}`
  );
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

- [ ] **Step 3: Register the seed command**

In `package.json`, add a top-level key (sibling of `"scripts"`):
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Run it**

Run: `npx prisma db seed`
Expected: prints `Seeded user demo@example.com with projects: Client Website, Personal Website`.

Note: re-running creates duplicate projects (the user upsert is idempotent, the projects aren't). To reset cleanly during development, use `npx prisma migrate reset` (drops, re-migrates, and re-seeds).

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json package-lock.json
git commit -m "Add seed script with demo user, projects, and tasks"
```

---

### Task 14: Theme provider (dark/light/system)

**Files:**
- Create: `src/components/theme-provider.tsx`
- Create: `src/components/layout/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`

`next-themes` was already installed in Task 3 (as a dependency of shadcn's `sonner.tsx` wrapper),
so this task only wires up the provider.

- [ ] **Step 1: Add the theme provider wrapper**

`src/components/theme-provider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 2: Add the theme toggle**

`src/components/layout/theme-toggle.tsx`:
```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          <Sun className="h-4 w-4 scale-100 dark:scale-0" />
          <Moon className="absolute h-4 w-4 scale-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Wire the provider and toaster into the root layout**

Open `src/app/layout.tsx` (generated in Task 1). Wrap the existing `{children}` in `<ThemeProvider>`, add `suppressHydrationWarning` to the `<html>` tag, and render `<Toaster />` from `@/components/ui/sonner` after `{children}`. Keep whatever font variables/imports Task 1 already generated — only add the provider, toaster, and `suppressHydrationWarning`. The result should look like this shape:

```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ...keep the existing font setup from Task 1 here...

export const metadata: Metadata = {
  title: "Task Tracker",
  description: "A personal project and task tracker.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body /* keep existing className from Task 1 */>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: build succeeds.

Manual check: `npm run dev`, open the app, use the theme toggle (once wired into the sidebar in Task 15) — for now confirm no console/hydration errors on any page.

- [ ] **Step 5: Commit**

```bash
git add src/components/theme-provider.tsx src/components/layout/theme-toggle.tsx src/app/layout.tsx
git commit -m "Add dark/light/system theme support"
```

---

### Task 15: Sidebar, mobile nav, and dashboard shell layout

This introduces the `(dashboard)` route group. `create-next-app` generated `src/app/page.tsx` for `/` — it must be removed, since `(dashboard)/page.tsx` will also resolve to `/` and Next.js does not allow two pages resolving to the same path.

**Files:**
- Create: `src/components/layout/nav-items.ts`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Delete: `src/app/page.tsx`

- [ ] **Step 1: Remove the default page**

```bash
rm src/app/page.tsx
```

- [ ] **Step 2: Add shared nav config**

`src/components/layout/nav-items.ts`:
```ts
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Today", href: "/today", icon: CalendarClock },
  { label: "Upcoming", href: "/upcoming", icon: CalendarDays },
  { label: "Completed", href: "/completed", icon: CheckCircle2 },
];

export const secondaryNavItems: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
];
```

- [ ] **Step 3: Add the desktop sidebar**

`src/components/layout/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, secondaryNavItems, type NavItem } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-14 items-center border-b px-4 font-semibold">Task Tracker</div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <SidebarLink key={item.href} item={item} active={pathname === item.href} />
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t p-3">
        {secondaryNavItems.map((item) => (
          <SidebarLink key={item.href} item={item} active={pathname === item.href} />
        ))}
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
        active ? "bg-muted text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
```

- [ ] **Step 4: Add the mobile nav**

`src/components/layout/mobile-nav.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navItems, secondaryNavItems } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = [...navItems, ...secondaryNavItems];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SheetTitle className="flex h-14 items-center border-b px-4 font-semibold">
          Task Tracker
        </SheetTitle>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
                pathname === item.href ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 5: Add the dashboard shell layout**

`src/app/(dashboard)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <MobileNav />
          <span className="font-semibold">Task Tracker</span>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npm run build`
Expected: build succeeds, no "duplicate page" error for `/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add sidebar, mobile nav, and dashboard shell layout"
```

---

### Task 16: Placeholder pages for every nav route

**Files:**
- Create: `src/app/(dashboard)/page.tsx`
- Create: `src/app/(dashboard)/projects/page.tsx`
- Create: `src/app/(dashboard)/today/page.tsx`
- Create: `src/app/(dashboard)/upcoming/page.tsx`
- Create: `src/app/(dashboard)/completed/page.tsx`
- Create: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Dashboard placeholder**

`src/app/(dashboard)/page.tsx`:
```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 2: Projects placeholder**

`src/app/(dashboard)/projects/page.tsx`:
```tsx
export default function ProjectsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Projects</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 3: Today placeholder**

`src/app/(dashboard)/today/page.tsx`:
```tsx
export default function TodayPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 4: Upcoming placeholder**

`src/app/(dashboard)/upcoming/page.tsx`:
```tsx
export default function UpcomingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Upcoming</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 5: Completed placeholder**

`src/app/(dashboard)/completed/page.tsx`:
```tsx
export default function CompletedPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Completed</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 6: Settings placeholder**

`src/app/(dashboard)/settings/page.tsx`:
```tsx
export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npm run build`
Expected: build succeeds, all six routes listed in the route table.

Manual check: `npm run dev`, log in, click through every sidebar link and every mobile nav link, confirm each renders its placeholder with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)
git commit -m "Add placeholder pages for all nav routes"
```

---

### Task 17: Final verification and CLAUDE.md update

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Full verification pass**

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Expected: all four succeed with no errors.

- [ ] **Step 2: Manual smoke test**

`npm run dev`, then in a browser:
1. Register a new account at `/auth/register` → confirm success toast + redirect to `/auth/login`
2. Log in → confirm redirect to `/` (Dashboard placeholder)
3. Open an incognito window, visit `/today` directly → confirm redirect to `/auth/login`
4. Toggle theme light/dark/system via the sidebar → confirm it applies immediately and persists across a page reload
5. Narrow the browser window below tablet width → confirm the sidebar disappears and the mobile menu button appears and opens the drawer nav

- [ ] **Step 3: Update CLAUDE.md's Commands section**

Replace the "Not yet established" placeholder in `CLAUDE.md`'s `## Commands` section with:

```markdown
## Commands

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type-check without emitting
- `npm test` — run Vitest once
- `npm run test:watch` — run Vitest in watch mode
- `npx prisma migrate dev --name <name>` — create and apply a migration
- `npx prisma db seed` — run `prisma/seed.ts`
- `npx prisma migrate reset` — drop, re-migrate, and re-seed the dev database
- `npx prisma studio` — browse the database in a GUI

Demo login after seeding: `demo@example.com` / `password123`.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Document Phase 1 commands in CLAUDE.md"
```

---

## Phase 1 done — what's next

Phase 2 (per `prompt.md`'s build order) is Projects CRUD: the `/projects` page listing real projects, the create-project sheet/modal, edit/archive/delete actions, and the `actions/projects.ts` Server Actions — all scoped to `session.user.id`. That gets its own brief brainstorm + plan before implementation, per the same process used for this phase.
