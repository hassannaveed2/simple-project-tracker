import { notFound } from "next/navigation";
import type { TaskStatus, TaskPriority } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { EditProjectButton } from "@/components/projects/edit-project-button";
import { AddTaskButton } from "@/components/tasks/add-task-button";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskFilters } from "@/components/tasks/task-filters";
import { ActivityFeed, type ActivityFeedItem } from "@/components/activity/activity-feed";
import { formatActivityMessage, type ActivityMessageInput } from "@/lib/format-activity-message";
import type { TaskListItemData } from "@/components/tasks/task-list-item";
import type { ProjectInput } from "@/lib/validations/project";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; priority?: string; due?: string }>;
}) {
  const { slug } = await params;
  const { status, priority, due } = await searchParams;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);

  const project = await prisma.project.findFirst({
    where: { slug, userId },
    include: {
      tasks: {
        where: {
          ...(status ? { status: status as TaskStatus } : {}),
          ...(priority ? { priority: priority as TaskPriority } : {}),
          ...(due === "overdue" ? { dueDate: { lt: todayStart } } : {}),
          ...(due === "today" ? { dueDate: { gte: todayStart, lt: todayEnd } } : {}),
          ...(due === "upcoming" ? { dueDate: { gte: todayEnd } } : {}),
          ...(due === "none" ? { dueDate: null } : {}),
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Progress must reflect ALL of the project's tasks, never the filtered subset above — fetched
  // separately so an active filter can never distort the completed/total ratio.
  const [allProjects, allProjectTaskStatuses, activityRows] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { projectId: project.id, userId },
      select: { status: true },
    }),
    prisma.activity.findMany({
      where: { projectId: project.id, userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const { completedCount, totalCount, percent } = computeProjectProgress(
    allProjectTaskStatuses.map((task) => task.status)
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

  const hasActiveFilters = Boolean(status || priority || due);

  const activityItems: ActivityFeedItem[] = activityRows.map((row) => ({
    id: row.id,
    message: formatActivityMessage({
      type: row.type,
      metadata: row.metadata,
    } as unknown as ActivityMessageInput),
    createdAt: row.createdAt,
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

      {totalCount > 0 ? <TaskFilters /> : null}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">No tasks yet.</p>
          <AddTaskButton projects={allProjects} defaultProjectId={project.id} label="Add Task" />
        </div>
      ) : taskItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? "No tasks match these filters." : "No tasks yet."}
        </p>
      ) : (
        <KanbanBoard initialTasks={taskItems} projects={allProjects} />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Activity</h2>
        <ActivityFeed items={activityItems} />
      </section>
    </div>
  );
}
