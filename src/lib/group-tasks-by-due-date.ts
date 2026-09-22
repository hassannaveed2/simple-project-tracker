import { formatDueDate } from "./format-due-date";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

export type DueDateTaskGroup = {
  label: string;
  tasks: TaskListItemData[];
};

export function groupTasksByDueDate(
  tasks: TaskListItemData[],
  now: Date = new Date()
): DueDateTaskGroup[] {
  const map = new Map<string, DueDateTaskGroup>();
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const { label } = formatDueDate(new Date(task.dueDate), now);
    const key = label ?? "Unscheduled";
    const existing = map.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(key, { label: key, tasks: [task] });
    }
  }
  return Array.from(map.values());
}
