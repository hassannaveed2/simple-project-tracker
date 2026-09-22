import { TaskListItem, type TaskListItemData } from "@/components/tasks/task-list-item";

export type TodayTaskGroup = {
  projectId: string;
  projectName: string;
  tasks: TaskListItemData[];
};

export function TodayTasksSection({
  groups,
  projects,
}: {
  groups: TodayTaskGroup[];
  projects: { id: string; name: string }[];
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">You don&apos;t have any tasks due today.</p>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.projectId} className="space-y-2">
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
