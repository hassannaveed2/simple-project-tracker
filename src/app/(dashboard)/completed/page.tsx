import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CompletedFilters } from "@/components/completed/completed-filters";
import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";

export default async function CompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; project?: string; period?: string }>;
}) {
  const { q, project, period } = await searchParams;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  let completedAfter: Date | undefined;
  if (period === "week") completedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "month") completedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [tasksRaw, allProjects] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId,
        status: "COMPLETED",
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        ...(project ? { projectId: project } : {}),
        ...(completedAfter ? { completedAt: { gte: completedAfter } } : {}),
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const taskItems: TaskListItemData[] = tasksRaw.map((task) => ({
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
      <h1 className="text-2xl font-semibold">Completed</h1>
      <CompletedFilters projects={allProjects} />
      {taskItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No completed tasks found.</p>
      ) : (
        <div className="space-y-2">
          {taskItems.map((task) => (
            <TaskListItem key={task.id} task={task} projects={allProjects} />
          ))}
        </div>
      )}
    </div>
  );
}
