import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toProjectCardData } from "@/lib/project-card-data";
import { NewProjectButton } from "@/components/projects/new-project-button";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFilters } from "@/components/projects/project-filters";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  // The (dashboard) layout already redirects unauthenticated requests before this page renders,
  // so a session is guaranteed here.
  const session = await auth();
  const userId = session!.user.id;

  const hasAnyProjects = (await prisma.project.count({ where: { userId } })) > 0;

  if (!hasAnyProjects) {
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

  const projects = await prisma.project.findMany({
    where: {
      userId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { tasks: { select: { status: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const projectCards = projects.map(toProjectCardData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <NewProjectButton />
      </div>
      <ProjectFilters />
      {projectCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectCards.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
