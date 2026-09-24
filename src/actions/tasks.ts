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
    select: { id: true, name: true, slug: true },
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

  revalidatePath(`/projects/${project.slug}`);
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
    select: { id: true, name: true, slug: true },
  });
  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { status: true, priority: true },
  });
  if (!existingTask) {
    return { success: false, error: "Task not found" };
  }

  const result = await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: toTaskData(userId, parsed.data),
  });

  if (result.count === 0) {
    return { success: false, error: "Task not found" };
  }

  const newPriority = parsed.data.priority as TaskPriority;
  const newStatus = parsed.data.status as TaskStatus;

  if (newPriority !== existingTask.priority) {
    await logActivity({
      userId,
      projectId: parsed.data.projectId,
      taskId,
      type: "TASK_PRIORITY_CHANGED",
      metadata: {
        title: parsed.data.title,
        projectName: project.name,
        from: existingTask.priority,
        to: newPriority,
      },
    });
  }

  if (newStatus === "COMPLETED" && existingTask.status !== "COMPLETED") {
    await logActivity({
      userId,
      projectId: parsed.data.projectId,
      taskId,
      type: "TASK_COMPLETED",
      metadata: { title: parsed.data.title, projectName: project.name },
    });
  }

  revalidatePath(`/projects/${project.slug}`);
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
    select: {
      projectId: true,
      status: true,
      title: true,
      project: { select: { name: true, slug: true } },
    },
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

  revalidatePath(`/projects/${task.project.slug}`);
  revalidatePath("/projects");
  return { success: true };
}

export type ReorderColumnInput = {
  status: TaskStatus;
  taskIds: string[];
};

// Note: this reindexes exactly the task IDs it's given, per column, to 0..N-1. If the Kanban
// board's filters are active when a drag happens, the given list is only the filtered-visible
// subset of a column — filtered-out siblings keep whatever order they already had, which can
// leave duplicate order values in that column until the user drags again with filters cleared.
// Harmless (ordering always falls back to a stable id tiebreak — see the orderBy this replaces),
// just a known, accepted limitation at this app's personal scale.
export async function reorderTasks(columns: ReorderColumnInput[]): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const allTaskIds = columns.flatMap((column) => column.taskIds);
  if (allTaskIds.length === 0) {
    return { success: false, error: "No tasks to reorder" };
  }

  const existingTasks = await prisma.task.findMany({
    where: { id: { in: allTaskIds }, userId },
    select: {
      id: true,
      status: true,
      title: true,
      projectId: true,
      project: { select: { name: true, slug: true } },
    },
  });
  if (existingTasks.length !== allTaskIds.length) {
    return { success: false, error: "Task not found" };
  }
  const taskById = new Map(existingTasks.map((task) => [task.id, task]));
  const projectSlug = existingTasks[0]!.project.slug;

  const completions: { taskId: string; projectId: string; title: string; projectName: string }[] =
    [];
  for (const column of columns) {
    for (const taskId of column.taskIds) {
      const task = taskById.get(taskId)!;
      if (column.status === "COMPLETED" && task.status !== "COMPLETED") {
        completions.push({
          taskId,
          projectId: task.projectId,
          title: task.title,
          projectName: task.project.name,
        });
      }
    }
  }

  await prisma.$transaction(
    columns.flatMap((column) =>
      column.taskIds.map((taskId, index) => {
        const task = taskById.get(taskId)!;
        return prisma.task.updateMany({
          where: { id: taskId, userId },
          data: {
            order: index,
            ...(task.status !== column.status
              ? {
                  status: column.status,
                  completedAt: column.status === "COMPLETED" ? new Date() : null,
                }
              : {}),
          },
        });
      })
    )
  );

  for (const completion of completions) {
    await logActivity({
      userId,
      projectId: completion.projectId,
      taskId: completion.taskId,
      type: "TASK_COMPLETED",
      metadata: { title: completion.title, projectName: completion.projectName },
    });
  }

  revalidatePath(`/projects/${projectSlug}`);
  revalidatePath("/projects");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const userId = await requireUserId();

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { project: { select: { slug: true } } },
  });
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await prisma.task.deleteMany({ where: { id: taskId, userId } });

  revalidatePath(`/projects/${task.project.slug}`);
  revalidatePath("/projects");
  return { success: true };
}
