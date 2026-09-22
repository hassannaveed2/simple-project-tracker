import { cn } from "@/lib/utils";
import { PROJECT_COLOR_ACCENT_CLASSES } from "@/lib/project-color-styles";
import { TaskListItem } from "./task-list-item";
import type { ProjectTaskGroup } from "@/lib/group-tasks-by-project";

export function TaskGroupList({
  groups,
  projects,
  emptyMessage,
}: {
  groups: ProjectTaskGroup[];
  projects: { id: string; name: string }[];
  emptyMessage: string;
}) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.projectId}
          className={cn(
            "space-y-2 border-l-4 pl-3",
            PROJECT_COLOR_ACCENT_CLASSES[
              group.projectColor as keyof typeof PROJECT_COLOR_ACCENT_CLASSES
            ]
          )}
        >
          <h3 className="text-sm font-medium text-muted-foreground">{group.projectName}</h3>
          <div className="space-y-2">
            {group.tasks.map((task) => (
              <TaskListItem key={task.id} task={task} projects={projects} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
