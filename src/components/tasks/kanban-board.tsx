"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { updateTaskStatus } from "@/actions/tasks";
import { TASK_STATUSES } from "@/lib/validations/task";
import { KanbanColumn } from "./kanban-column";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

export function KanbanBoard({
  initialTasks,
  projects,
  projectColor,
}: {
  initialTasks: TaskListItemData[];
  projects: { id: string; name: string }[];
  projectColor: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskListItemData | null>(null);

  // Re-sync whenever the server-provided list changes — e.g. any create/edit/delete/checkbox
  // action elsewhere on the page triggers revalidatePath and this page re-renders with fresh
  // data. This also corrects the optimistic move below if its guess at column order was off.
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as (typeof TASK_STATUSES)[number] | undefined;
    if (!newStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousTasks = tasks;
    setTasks((current) => current.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    updateTaskStatus(taskId, newStatus).then((result) => {
      if (!result.success) {
        setTasks(previousTasks);
        toast.error(result.error);
      }
    });
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex flex-col gap-4 md:flex-row">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((t) => t.status === status)}
            projects={projects}
            projectColor={projectColor}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskListItem
            task={activeTask}
            projects={projects}
            variant="card"
            projectColor={projectColor}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
