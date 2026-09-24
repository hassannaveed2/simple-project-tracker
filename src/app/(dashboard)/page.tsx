import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGreeting } from "@/lib/greeting";
import { toProjectCardData } from "@/lib/project-card-data";
import { groupTasksByProject } from "@/lib/group-tasks-by-project";
import { StatCard } from "@/components/dashboard/stat-card";
import { TaskGroupList } from "@/components/tasks/task-group-list";
import { UpcomingTaskRow, type UpcomingTaskData } from "@/components/dashboard/upcoming-task-row";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { ProjectCard } from "@/components/projects/project-card";
import { ActivityFeed, type ActivityFeedItem } from "@/components/activity/activity-feed";
import { formatActivityMessage, type ActivityMessageInput } from "@/lib/format-activity-message";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export default async function DashboardPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;
  const userName = session!.user.name ?? "there";

  const now = new Date();
  const greeting = getGreeting(now.getUTCHours());
  const todayStart = startOfUtcDay(now);
  const todayEnd = addDays(todayStart, 1);
  const calendarWindowStart = addDays(todayStart, -30);
  const calendarWindowEnd = addDays(todayStart, 60);

  const [
    totalProjects,
    activeTasks,
    dueTodayCount,
    completedThisWeek,
    todaysTasksRaw,
    windowTasksRaw,
    recentProjectsRaw,
    allProjectsForTaskForm,
    recentActivityRaw,
  ] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: { not: "COMPLETED" } } }),
    prisma.task.count({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.task.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: addDays(now, -7) } },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: "COMPLETED" }, dueDate: { gte: todayStart, lt: todayEnd } },
      include: { project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ priority: "desc" }],
    }),
    prisma.task.findMany({
      where: {
        userId,
        status: { not: "COMPLETED" },
        dueDate: { gte: calendarWindowStart, lt: calendarWindowEnd },
      },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.project.findMany({
      where: { userId },
      include: { tasks: { select: { status: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3,
    }),
    prisma.project.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const todayGroups = groupTasksByProject(
    todaysTasksRaw.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description ?? "",
      notes: task.notes ?? "",
      projectId: task.projectId,
      priority: task.priority,
      status: task.status,
      order: task.order,
      dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
      projectName: task.project.name,
      projectColor: task.project.color,
    }))
  );

  const windowTaskItems: UpcomingTaskData[] = windowTasksRaw
    .filter((task): task is typeof task & { dueDate: Date } => task.dueDate !== null)
    .map((task) => ({
      id: task.id,
      title: task.title,
      projectName: task.project.name,
      priority: task.priority,
      dueDate: task.dueDate,
    }));

  const upcomingPreview = windowTaskItems
    .filter((task) => task.dueDate >= todayEnd && task.dueDate < addDays(todayEnd, 7))
    .slice(0, 5);

  const recentProjects = recentProjectsRaw.map(toProjectCardData);

  const recentActivityItems: ActivityFeedItem[] = recentActivityRaw.map((row) => ({
    id: row.id,
    message: formatActivityMessage({
      type: row.type,
      metadata: row.metadata,
    } as unknown as ActivityMessageInput),
    createdAt: row.createdAt,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {userName}
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s what you have to work on.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Projects" value={totalProjects} color="#6366f1" />
        <StatCard label="Active Tasks" value={activeTasks} color="#0ea5e9" />
        <StatCard label="Due Today" value={dueTodayCount} color="#f97316" />
        <StatCard label="Completed This Week" value={completedThisWeek} color="#22c55e" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Today&apos;s Tasks</h2>
            <TaskGroupList
              groups={todayGroups}
              projects={allProjectsForTaskForm}
              emptyMessage="You don't have any tasks due today."
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Upcoming Tasks</h2>
            {upcomingPreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
            ) : (
              <div className="space-y-2">
                {upcomingPreview.map((task) => (
                  <UpcomingTaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Recent Projects</h2>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create your first project to start organizing your work.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Calendar</h2>
            <DashboardCalendar tasks={windowTaskItems} />
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <ActivityFeed items={recentActivityItems} />
          </section>
        </div>
      </div>
    </div>
  );
}
