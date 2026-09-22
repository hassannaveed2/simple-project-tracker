"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ActivityType =
  | "PROJECT_CREATED"
  | "TASK_CREATED"
  | "TASK_COMPLETED"
  | "TASK_PRIORITY_CHANGED";

type LogActivityInput = {
  userId: string;
  projectId?: string;
  taskId?: string;
  type: ActivityType;
  metadata: Prisma.InputJsonValue;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  await prisma.activity.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      taskId: input.taskId,
      type: input.type,
      metadata: input.metadata,
    },
  });
}
