import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeProjectProgress } from "@/lib/progress";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import type { ProjectInput } from "@/lib/validations/project";

export default async function ProjectsPage() {
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { tasks: { select: { status: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="max-w-sm text-muted-foreground">
          Create your first project to start organizing your work.
        </p>
        <NewProjectButton label="Create Project" />
      </div>
    );
  }

  const projectCards: ProjectCardData[] = projects.map((project) => {
    const { completedCount, totalCount, percent } = computeProjectProgress(
      project.tasks.map((task) => task.status)
    );

    return {
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description ?? "",
      color: project.color as ProjectInput["color"],
      status: project.status,
      completedCount,
      totalCount,
      percent,
      updatedAtLabel: formatRelativeTime(project.updatedAt),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <NewProjectButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projectCards.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
