import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { groupTasksByProject } from "@/lib/group-tasks-by-project";
import { TaskGroupList } from "@/components/tasks/task-group-list";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function TodayPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);

  const [overdueRaw, dueTodayRaw, noDueDateRaw, allProjects] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { lt: todayStart } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayStart, lt: todayEnd } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: null },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  function toTaskItems(rawTasks: typeof overdueRaw) {
    return rawTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      notes: task.notes ?? "",
      projectId: task.projectId,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
      projectName: task.project.name,
      projectColor: task.project.color,
    }));
  }

  const overdueGroups = groupTasksByProject(toTaskItems(overdueRaw));
  const dueTodayGroups = groupTasksByProject(toTaskItems(dueTodayRaw));
  const noDueDateGroups = groupTasksByProject(toTaskItems(noDueDateRaw));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Today</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Overdue</h2>
        <TaskGroupList
          groups={overdueGroups}
          projects={allProjects}
          emptyMessage="No overdue tasks."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Due Today</h2>
        <TaskGroupList
          groups={dueTodayGroups}
          projects={allProjects}
          emptyMessage="You don't have any tasks due today."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">No Due Date</h2>
        <TaskGroupList
          groups={noDueDateGroups}
          projects={allProjects}
          emptyMessage="No tasks without a due date."
        />
      </section>
    </div>
  );
}
