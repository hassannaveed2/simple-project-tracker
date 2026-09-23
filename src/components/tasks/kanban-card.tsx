"use client";

import { useDraggable } from "@dnd-kit/core";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

export function KanbanCard({
  task,
  projects,
  projectColor,
}: {
  task: TaskListItemData;
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : undefined}
    >
      <TaskListItem task={task} projects={projects} variant="card" projectColor={projectColor} />
    </div>
  );
}
