"use server";

import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { taskSchema, type TaskInput } from "@/lib/validations/task";
import { logActivity } from "./activity";

export type TaskActionResult = { success: true } | { success: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user.id;
}

function toTaskData(userId: string, input: TaskInput) {
  return {
    userId,
    projectId: input.projectId,
    title: input.title,
    description: input.description || null,
    notes: input.notes || null,
    priority: input.priority as TaskPriority,
    status: input.status as TaskStatus,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  };
}

export async function createTask(input: TaskInput): Promise<TaskActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  // projectId is user-submitted (a <select> value) — unlike a task's own id, it must be checked
  // against this user's projects before we attach a task to it.
  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId },
    select: { id: true, name: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const task = await prisma.task.create({ data: toTaskData(userId, parsed.data) });

  await logActivity({
    userId,
    projectId: task.projectId,
    taskId: task.id,
    type: "TASK_CREATED",
    metadata: { title: task.title, projectName: project.name },
  });

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function updateTask(taskId: string, input: TaskInput): Promise<TaskActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const userId = await requireUserId();

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId },
    select: { id: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const result = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: toTaskData(userId, parsed.data),
  });

  if (result.count === 0) {
    return { success: false, error: "Task not found" };
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { projectId: true, status: true, title: true, project: { select: { name: true } } },
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  if (status === "COMPLETED" && task.status !== "COMPLETED") {
    await logActivity({
      userId,
      projectId: task.projectId,
      taskId,
      type: "TASK_COMPLETED",
      metadata: { title: task.title, projectName: task.project.name },
    });
  }

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { projectId: true },
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await prisma.task.deleteMany({ where: { id: taskId, userId } });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/projects");
  return { success: true };
}
