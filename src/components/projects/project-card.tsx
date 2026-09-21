"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveProject } from "@/actions/projects";
import { ProjectFormSheet } from "./project-form-sheet";
import { DeleteProjectDialog } from "./delete-project-dialog";
import type { ProjectInput } from "@/lib/validations/project";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export type ProjectCardData = ProjectInput & {
  id: string;
  completedCount: number;
  totalCount: number;
  percent: number;
  updatedAtLabel: string;
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleArchive() {
    const result = await archiveProject(project.id);
    if (result.success) {
      toast.success("Project archived");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
            {project.name}
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Project actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>Open</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>Archive</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {project.description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
      ) : null}

      <Badge variant="secondary" className="w-fit">
        {STATUS_LABELS[project.status]}
      </Badge>

      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${project.percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {project.totalCount === 0
            ? "No tasks yet"
            : `${project.completedCount}/${project.totalCount} tasks · ${project.percent}%`}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">Updated {project.updatedAtLabel}</p>

      <ProjectFormSheet open={editOpen} onOpenChange={setEditOpen} project={project} />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
}
