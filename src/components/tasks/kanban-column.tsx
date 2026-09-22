"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { TaskListItemData } from "./task-list-item";
import type { TASK_STATUSES } from "@/lib/validations/task";

const COLUMN_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export function KanbanColumn({
  status,
  tasks,
  projects,
  projectColor,
}: {
  status: (typeof TASK_STATUSES)[number];
  tasks: TaskListItemData[];
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-32 flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-3",
        isOver && "bg-muted"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{COLUMN_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} projects={projects} projectColor={projectColor} />
        ))}
      </div>
    </div>
  );
}
