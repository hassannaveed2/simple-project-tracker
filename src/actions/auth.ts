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
