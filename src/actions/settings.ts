"use server";

import { prisma } from "@/lib/db";
import { auth, signOut } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  profileSchema,
  passwordSchema,
  type ProfileInput,
  type PasswordInput,
} from "@/lib/validations/settings";

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

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/auth/login" });
}

export async function deleteAccount(): Promise<void> {
  const userId = await requireUserId();
  await prisma.user.delete({ where: { id: userId } });
  await signOut({ redirectTo: "/auth/login" });
}
