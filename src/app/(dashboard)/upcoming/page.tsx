import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupTasksByDueDate } from "@/lib/group-tasks-by-due-date";
import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function UpcomingPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);
  const windowEnd = addDays(todayStart, 30);

  const [tasksRaw, allProjects] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayEnd, lt: windowEnd } },
      orderBy: { dueDate: "asc" },
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
    order: task.order,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
  }));

  const groups = groupTasksByDueDate(taskItems);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Upcoming</h1>
      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-lg font-medium">{group.label}</h2>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <TaskListItem key={task.id} task={task} projects={allProjects} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
