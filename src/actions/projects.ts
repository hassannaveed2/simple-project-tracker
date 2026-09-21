"use server";

import { revalidatePath } from "next/cache";
import type { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { projectSchema, type ProjectInput } from "@/lib/validations/project";

export type ProjectActionResult = { success: true } | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

export async function createProject(input: ProjectInput): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  await prisma.project.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      status: parsed.data.status as ProjectStatus,
    },
  });

  revalidatePath("/projects");
  return { success: true };
}

export async function updateProject(
  projectId: string,
  input: ProjectInput
): Promise<ProjectActionResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      status: parsed.data.status as ProjectStatus,
    },
  });

  if (result.count === 0) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function archiveProject(projectId: string): Promise<ProjectActionResult> {
  const userId = await requireUserId();
  const result = await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });

  if (result.count === 0) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function deleteProject(projectId: string): Promise<ProjectActionResult> {
  const userId = await requireUserId();
  const result = await prisma.project.deleteMany({ where: { id: projectId, userId } });

  if (result.count === 0) {
    return { success: false, error: "Project not found" };
  }

  revalidatePath("/projects");
  return { success: true };
}
