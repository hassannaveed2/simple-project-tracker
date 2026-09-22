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
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const project = await prisma.project.findFirst({
    where: { id, userId },
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
