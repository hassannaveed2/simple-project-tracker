import { TASK_PRIORITIES } from "@/lib/validations/task";

export const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_BADGE_CLASSES: Record<(typeof TASK_PRIORITIES)[number], string> = {
  LOW: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
  MEDIUM:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900",
  URGENT:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
};
