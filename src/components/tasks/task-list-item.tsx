"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/actions/tasks";
import { formatDueDate } from "@/lib/format-due-date";
import { TaskFormSheet } from "./task-form-sheet";
import type { TaskInput } from "@/lib/validations/task";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type TaskListItemData = TaskInput & { id: string };

export function TaskListItem({
  task,
  projects,
  variant = "row",
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
  variant?: "row" | "card";
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isCompleted = task.status === "COMPLETED";
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const dueDateInfo = formatDueDate(dueDateObj);

  function handleToggle() {
    const nextStatus = isCompleted ? "TODO" : "COMPLETED";
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  const dueDateChip = dueDateInfo.label ? (
    <span
      className={cn(
        "text-xs",
        dueDateInfo.variant === "overdue" && "text-destructive",
        dueDateInfo.variant === "today" && "font-medium text-foreground",
        dueDateInfo.variant === "tomorrow" && "font-medium text-amber-600 dark:text-amber-400",
        dueDateInfo.variant === "upcoming" && "text-muted-foreground"
      )}
    >
      {dueDateInfo.label}
    </span>
  ) : null;

  const editSheet = (
    <TaskFormSheet
      open={editOpen}
      onOpenChange={setEditOpen}
      projects={projects}
      defaultProjectId={task.projectId}
      task={task}
    />
  );

  if (variant === "card") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-3">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className={cn(
            "text-left text-sm",
            isCompleted && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </button>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
          {dueDateChip}
        </div>
        {editSheet}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Checkbox checked={isCompleted} disabled={isPending} onCheckedChange={handleToggle} />
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className={cn(
          "flex-1 text-left text-sm",
          isCompleted && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </button>
      <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
      {dueDateChip}
      {editSheet}
    </div>
  );
}
