import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDueDate } from "@/lib/format-due-date";

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type UpcomingTaskData = {
  id: string;
  title: string;
  projectName: string;
  priority: string;
  dueDate: Date;
};

export function UpcomingTaskRow({ task }: { task: UpcomingTaskData }) {
  const dueDateInfo = formatDueDate(task.dueDate);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="outline">{PRIORITY_LABELS[task.priority]}</Badge>
        <span
          className={cn(
            "text-xs",
            dueDateInfo.variant === "overdue" && "text-destructive",
            dueDateInfo.variant === "today" && "font-medium text-foreground",
            dueDateInfo.variant === "upcoming" && "text-muted-foreground"
          )}
        >
          {dueDateInfo.label}
        </span>
      </div>
    </div>
  );
}
