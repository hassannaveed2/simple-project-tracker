export type DueDateVariant = "overdue" | "today" | "tomorrow" | "upcoming" | "none";

export type DueDateInfo = {
  label: string | null;
  variant: DueDateVariant;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatDueDate(
  dueDate: Date | null,
  now: Date = new Date(),
  isCompleted: boolean = false
): DueDateInfo {
  if (!dueDate) {
    return { label: null, variant: "none" };
  }

  const shortDate = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  // "Overdue"/"Today"/"Tomorrow" are urgency signals for work still pending — once a task is
  // completed, that framing is misleading (it reads as "needs attention" when it doesn't), so
  // completed tasks always show the plain date instead, regardless of how it compares to now.
  if (isCompleted) {
    return { label: shortDate, variant: "upcoming" };
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
    return { label: "Tomorrow", variant: "tomorrow" };
  }
  return { label: shortDate, variant: "upcoming" };
}
