# Phase 12: Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/settings` "Coming soon." placeholder with four working sections: Profile (edit name), Theme (light/dark/system), Account (change password + log out), and Data management (export JSON + delete account).

**Architecture:** A single `src/actions/settings.ts` holds five Server Actions: `updateProfile`/`changePassword`/`exportUserData` follow this codebase's existing `{success, error}` + React-Hook-Form pattern (same as `registerUser`); `logout`/`deleteAccount` are session-ending actions invoked via native `<form action={...}>` (Auth.js v5's documented App Router pattern), since they call the server-side `signOut()` which throws a redirect internally — a pattern this codebase hasn't needed before now, since it has never had a logout control.

**Tech Stack:** No new dependencies. Reuses `next-auth`'s server `signOut` (already exported from `src/lib/auth.ts`), the existing `hashPassword`/`verifyPassword` helpers, and the existing shadcn `alert-dialog`/`select`/`form`/`input` components.

**Design doc:** `docs/superpowers/specs/2026-09-22-phase12-settings-page-design.md`

---

### Task 1: Settings validation schemas (TDD)

**Files:**
- Create: `src/lib/validations/settings.ts`
- Test: `src/lib/validations/settings.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/validations/settings.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { profileSchema, passwordSchema } from "./settings";

describe("profileSchema", () => {
  it("accepts a non-empty trimmed name", () => {
    expect(profileSchema.safeParse({ name: "Jack" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(profileSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(profileSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a new password shorter than 8 characters", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched new/confirm passwords", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "newpassword1",
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing current password", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './settings'`

- [ ] **Step 3: Implement**

`src/lib/validations/settings.ts`:
```ts
import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/settings.ts src/lib/validations/settings.test.ts
git commit -m "Add settings validation schemas"
```

---

### Task 2: Settings server actions

**Files:**
- Create: `src/actions/settings.ts`

- [ ] **Step 1: Implement**

`src/actions/settings.ts`:
```ts
"use server";

import { prisma } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { profileSchema, passwordSchema, type ProfileInput, type PasswordInput } from "@/lib/validations/settings";

export type SettingsActionResult = { success: true } | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

export async function updateProfile(input: ProfileInput): Promise<SettingsActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });

  return { success: true };
}

export async function changePassword(input: PasswordInput): Promise<SettingsActionResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const isCurrentPasswordValid = await verifyPassword(parsed.data.currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const hashed = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return { success: true };
}

export async function exportUserData() {
  const userId = await requireUserId();

  const [projects, tasks, activities] = await Promise.all([
    prisma.project.findMany({ where: { userId } }),
    prisma.task.findMany({ where: { userId } }),
    prisma.activity.findMany({ where: { userId } }),
  ]);

  return { projects, tasks, activities };
}

export async function logout(_formData: FormData): Promise<void> {
  await signOut({ redirectTo: "/auth/login" });
}

export async function deleteAccount(_formData: FormData): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/auth/login" });
}
```

Notes:
- `logout`/`deleteAccount` take an unused `_formData: FormData` parameter so their signature matches
  what a native `<form action={...}>` passes — they're invoked that way (Task 6/8), not via a
  React-Hook-Form `onSubmit`, because `signOut({ redirectTo })` throws a redirect internally and
  that's the well-supported way to let it propagate.
- `deleteAccount`'s `prisma.user.delete` cascades to that user's Projects, Tasks, and Activity via
  the `onDelete: Cascade` foreign keys already in the schema — no manual cleanup needed.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/actions/settings.ts
git commit -m "Add settings server actions"
```

---

### Task 3: `ProfileForm` component

**Files:**
- Create: `src/components/settings/profile-form.tsx`

- [ ] **Step 1: Implement**

`src/components/settings/profile-form.tsx`:
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { profileSchema, type ProfileInput } from "@/lib/validations/settings";
import { updateProfile } from "@/actions/settings";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name },
  });

  async function onSubmit(values: ProfileInput) {
    const result = await updateProfile(values);
    if (result.success) {
      toast.success("Profile updated");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
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
        <div className="space-y-2">
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/profile-form.tsx
git commit -m "Add ProfileForm component"
```

---

### Task 4: `ThemeSelect` component

**Files:**
- Create: `src/components/settings/theme-select.tsx`

- [ ] **Step 1: Implement**

`src/components/settings/theme-select.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes can't know the persisted theme until after hydration; rendering a value before
  // that would mismatch between server and client. Render nothing until mounted, matching the
  // pattern next-themes' own docs recommend for theme-dependent UI.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="System" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="system">System</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/theme-select.tsx
git commit -m "Add ThemeSelect component"
```

---

### Task 5: `PasswordForm` component

**Files:**
- Create: `src/components/settings/password-form.tsx`

- [ ] **Step 1: Implement**

`src/components/settings/password-form.tsx`:
```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { passwordSchema, type PasswordInput } from "@/lib/validations/settings";
import { changePassword } from "@/actions/settings";

export function PasswordForm() {
  const form = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordInput) {
    const result = await changePassword(values);
    if (result.success) {
      toast.success("Password updated");
      form.reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/password-form.tsx
git commit -m "Add PasswordForm component"
```

---

### Task 6: `LogoutButton` component

**Files:**
- Create: `src/components/settings/logout-button.tsx`

- [ ] **Step 1: Implement**

`src/components/settings/logout-button.tsx`:
```tsx
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/settings";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline">
        Log Out
      </Button>
    </form>
  );
}
```

No `"use client"` — a plain `<form action={serverAction}>` works from a Server Component; there's
no client-side state here at all.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/logout-button.tsx
git commit -m "Add LogoutButton component"
```

---

### Task 7: `ExportDataButton` component

**Files:**
- Create: `src/components/settings/export-data-button.tsx`

- [ ] **Step 1: Implement**

`src/components/settings/export-data-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportUserData } from "@/actions/settings";

export function ExportDataButton() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "task-tracker-export.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? "Exporting…" : "Export Data"}
    </Button>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/export-data-button.tsx
git commit -m "Add ExportDataButton component"
```

---

### Task 8: `DeleteAccountDialog` component

**Files:**
- Create: `src/components/settings/delete-account-dialog.tsx`

- [ ] **Step 1: Implement**

`src/components/settings/delete-account-dialog.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { deleteAccount } from "@/actions/settings";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete Account
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and all of your projects, tasks, and
              activity. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <form action={deleteAccount}>
              <Button type="submit" variant="destructive">
                Delete Account
              </Button>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

This uses a plain submit `Button` inside a `<form action={deleteAccount}>` instead of
`AlertDialogAction`, because `AlertDialogAction`'s own `onClick` handling is meant for
client-side confirm actions that close the dialog — here, `deleteAccount` ends the session and
navigates away itself (via `signOut({ redirectTo })`), so no separate close-the-dialog step is
needed on success.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/delete-account-dialog.tsx
git commit -m "Add DeleteAccountDialog component"
```

---

### Task 9: Assemble the Settings page

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Implement**

Replace the full contents of `src/app/(dashboard)/settings/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeSelect } from "@/components/settings/theme-select";
import { PasswordForm } from "@/components/settings/password-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export default async function SettingsPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  // Read the user's current name/email fresh from the database rather than trusting the JWT
  // session claims, since updateProfile can change `name` without the session token refreshing.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Profile</h2>
        <ProfileForm name={user.name ?? ""} email={user.email} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Theme</h2>
        <ThemeSelect />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Account</h2>
        <PasswordForm />
        <LogoutButton />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Data Management</h2>
        <div className="flex flex-wrap gap-3">
          <ExportDataButton />
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/settings/page.tsx"
git commit -m "Assemble Settings page from Profile/Theme/Account/Data sections"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Automated checks**

Run, in order:
```bash
npx tsc --noEmit
npm run lint
npm test -- --run
npm run build
```
Expected: all pass with no errors.

- [ ] **Step 2: Manual browser walkthrough**

Start the dev server (`npm run dev`) and, logged in as `demo@example.com` / `password123`:

1. Navigate to `/settings` — confirm all four sections render: Profile (with the current name
   pre-filled and email shown read-only), Theme, Account (password form + Log Out button), Data
   Management (Export Data + Delete Account buttons).
2. Change the Profile name to something else and save — confirm a success toast, and confirm the
   new name persists after a page reload.
3. Use the Theme select to switch to Dark, then System, then Light — confirm the page's actual
   appearance changes each time, matching the existing sidebar toggle's behavior.
4. In the Account section, try changing the password with an intentionally wrong current
   password — confirm an error toast ("Current password is incorrect") and no change occurs.
5. Try submitting a new password with a confirm value that doesn't match — confirm inline
   validation blocks submission before it reaches the server.
6. Successfully change the password to a new value.
7. Click "Log Out" — confirm it redirects to `/auth/login` and the session is actually ended (a
   direct navigation back to `/` should also redirect to login).
8. Log back in using `demo@example.com` and the **new** password from step 6 — confirm it works
   (proves the password change actually persisted). Afterward, change it back to `password123`
   via the same flow, so the seed credentials keep working for future verification sessions.
9. Click "Export Data" — confirm a `task-tracker-export.json` file downloads, and open it to
   confirm it contains `projects`, `tasks`, and `activities` arrays matching this account's data.
10. Register a brand-new, disposable account (via `/auth/register`) specifically to test deletion
    — do NOT use the demo account for this step. Log in as that new account, go to
    `/settings`, click "Delete Account", confirm the dialog, and confirm the confirm click signs
    out and redirects to `/auth/login`. Confirm attempting to log back in with that account's
    credentials fails (account is gone).
11. Check the browser console for errors throughout — expect none.

- [ ] **Step 3: Mark this plan's checkboxes complete**

```bash
sed -i 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-22-phase12-settings-page.md
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-22-phase12-settings-page.md
git commit -m "Mark Phase 12 (Settings page) plan complete after manual verification"
```
