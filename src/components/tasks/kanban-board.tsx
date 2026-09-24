"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { reorderTasks } from "@/actions/tasks";
import { TASK_STATUSES } from "@/lib/validations/task";
import { KanbanColumn } from "./kanban-column";
import { TaskListItem, type TaskListItemData } from "./task-list-item";

type TaskStatusValue = (typeof TASK_STATUSES)[number];

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
  // Snapshot of `tasks` at the start of the current drag gesture — used to revert onDragOver's
  // live reordering if the drag is cancelled or dropped outside any valid target.
  const dragStartTasksRef = useRef<TaskListItemData[]>(initialTasks);

  // Re-sync whenever the server-provided list changes — e.g. any create/edit/delete/checkbox
  // action elsewhere on the page triggers revalidatePath and this page re-renders with fresh
  // data. This also corrects the optimistic move below if its guess at column order was off.
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    dragStartTasksRef.current = tasks;
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  // Fires continuously as the pointer moves over a different card or column. Live-repositions
  // the active task in local state — via `arrayMove`, same as a plain single-list sortable — so
  // siblings visibly slide out of the way, both within a column and across columns (which also
  // flips the active task's status to match).
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setTasks((current) => {
      const activeIndex = current.findIndex((t) => t.id === activeId);
      if (activeIndex === -1) return current;

      const overTask = current.find((t) => t.id === overId);
      const overStatus = overTask ? overTask.status : (overId as TaskStatusValue);
      const activeStatus = current[activeIndex].status;

      const next =
        activeStatus === overStatus
          ? current
          : current.map((t, i) => (i === activeIndex ? { ...t, status: overStatus } : t));

      const overIndex = overTask ? next.findIndex((t) => t.id === overId) : next.length - 1;
      if (overIndex === -1) return next;

      return arrayMove(next, activeIndex, overIndex);
    });
  }

  // By drop time, `tasks` already reflects the fully-converged final arrangement from onDragOver
  // — this just persists it. If dropped outside any valid target, `over` is null and the whole
  // gesture reverts to how it looked before the drag started.
  function handleDragEnd(event: DragEndEvent) {
    const dragged = activeTask;
    setActiveTask(null);

    if (!event.over || !dragged) {
      setTasks(dragStartTasksRef.current);
      return;
    }

    const activeId = event.active.id as string;
    const finalStatus = tasks.find((t) => t.id === activeId)?.status ?? dragged.status;
    const affectedStatuses = new Set<TaskStatusValue>([dragged.status, finalStatus]);
    const columns = Array.from(affectedStatuses).map((status) => ({
      status,
      taskIds: tasks.filter((t) => t.status === status).map((t) => t.id),
    }));

    const previousTasks = dragStartTasksRef.current;
    reorderTasks(columns).then((result) => {
      if (!result.success) {
        setTasks(previousTasks);
        toast.error(result.error);
      }
    });
  }

  function handleDragCancel() {
    setActiveTask(null);
    setTasks(dragStartTasksRef.current);
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
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
