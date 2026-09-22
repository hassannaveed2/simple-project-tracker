import type { TaskListItemData } from "@/components/tasks/task-list-item";

export type ProjectTaskGroup = {
  projectId: string;
  projectName: string;
  projectColor: string;
  tasks: TaskListItemData[];
};

export function groupTasksByProject(
  tasks: (TaskListItemData & { projectName: string; projectColor: string })[]
): ProjectTaskGroup[] {
  const map = new Map<string, ProjectTaskGroup>();
  for (const task of tasks) {
    const existing = map.get(task.projectId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      map.set(task.projectId, {
        projectId: task.projectId,
        projectName: task.projectName,
        projectColor: task.projectColor,
        tasks: [task],
      });
    }
  }
  return Array.from(map.values());
}
