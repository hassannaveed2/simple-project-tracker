const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export type ActivityMessageInput =
  | { type: "PROJECT_CREATED"; metadata: { name: string } }
  | { type: "TASK_CREATED"; metadata: { title: string; projectName: string } }
  | { type: "TASK_COMPLETED"; metadata: { title: string; projectName: string } }
  | {
      type: "TASK_PRIORITY_CHANGED";
      metadata: { title: string; projectName: string; from: string; to: string };
    };

export function formatActivityMessage(activity: ActivityMessageInput): string {
  switch (activity.type) {
    case "PROJECT_CREATED":
      return `Created project "${activity.metadata.name}"`;
    case "TASK_CREATED":
      return `Created task "${activity.metadata.title}"`;
    case "TASK_COMPLETED":
      return `Completed "${activity.metadata.title}"`;
    case "TASK_PRIORITY_CHANGED": {
      const from = PRIORITY_LABELS[activity.metadata.from] ?? activity.metadata.from;
      const to = PRIORITY_LABELS[activity.metadata.to] ?? activity.metadata.to;
      return `Changed "${activity.metadata.title}" priority from ${from} to ${to}`;
    }
  }
}
