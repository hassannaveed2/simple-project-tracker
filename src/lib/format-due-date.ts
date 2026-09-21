export type DueDateVariant = "overdue" | "today" | "upcoming" | "none";

export type DueDateInfo = {
  label: string | null;
  variant: DueDateVariant;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatDueDate(dueDate: Date | null, now: Date = new Date()): DueDateInfo {
  if (!dueDate) {
    return { label: null, variant: "none" };
  }

  const diffDays = Math.round(
    (startOfUtcDay(dueDate) - startOfUtcDay(now)) / (24 * 60 * 60 * 1000)
  );

  if (diffDays < 0) {
    return { label: "Overdue", variant: "overdue" };
  }
  if (diffDays === 0) {
    return { label: "Today", variant: "today" };
  }
  if (diffDays === 1) {
    return { label: "Tomorrow", variant: "upcoming" };
  }
  return {
    label: dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    variant: "upcoming",
  };
}
