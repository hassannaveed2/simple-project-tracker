import { computeProjectProgress } from "./progress";
import { formatRelativeTime } from "./format-relative-time";
import type { ProjectCardData } from "@/components/projects/project-card";
import type { ProjectInput } from "./validations/project";

type ProjectForCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectInput["status"];
  updatedAt: Date;
  tasks: { status: string }[];
};

export function toProjectCardData(project: ProjectForCard): ProjectCardData {
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
}
