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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50" : undefined}
    >
      <TaskListItem task={task} projects={projects} variant="card" projectColor={projectColor} />
    </div>
  );
}
