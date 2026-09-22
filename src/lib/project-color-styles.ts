import { PROJECT_COLORS } from "@/lib/validations/project";

type ProjectColor = (typeof PROJECT_COLORS)[number];

export const PROJECT_COLOR_CARD_CLASSES: Record<ProjectColor, string> = {
  "#6366f1":
    "bg-gradient-to-br from-indigo-50 to-background border-indigo-200 dark:from-indigo-950/40 dark:to-background dark:border-indigo-900",
  "#22c55e":
    "bg-gradient-to-br from-green-50 to-background border-green-200 dark:from-green-950/40 dark:to-background dark:border-green-900",
  "#f97316":
    "bg-gradient-to-br from-orange-50 to-background border-orange-200 dark:from-orange-950/40 dark:to-background dark:border-orange-900",
  "#ef4444":
    "bg-gradient-to-br from-red-50 to-background border-red-200 dark:from-red-950/40 dark:to-background dark:border-red-900",
  "#0ea5e9":
    "bg-gradient-to-br from-sky-50 to-background border-sky-200 dark:from-sky-950/40 dark:to-background dark:border-sky-900",
  "#a855f7":
    "bg-gradient-to-br from-purple-50 to-background border-purple-200 dark:from-purple-950/40 dark:to-background dark:border-purple-900",
  "#eab308":
    "bg-gradient-to-br from-yellow-50 to-background border-yellow-200 dark:from-yellow-950/40 dark:to-background dark:border-yellow-900",
  "#64748b":
    "bg-gradient-to-br from-slate-50 to-background border-slate-200 dark:from-slate-950/40 dark:to-background dark:border-slate-900",
};

export const PROJECT_COLOR_HEADER_CLASSES: Record<ProjectColor, string> = {
  "#6366f1":
    "bg-gradient-to-r from-indigo-100 via-indigo-50 to-transparent dark:from-indigo-950/30 dark:via-indigo-950/10 dark:to-transparent",
  "#22c55e":
    "bg-gradient-to-r from-green-100 via-green-50 to-transparent dark:from-green-950/30 dark:via-green-950/10 dark:to-transparent",
  "#f97316":
    "bg-gradient-to-r from-orange-100 via-orange-50 to-transparent dark:from-orange-950/30 dark:via-orange-950/10 dark:to-transparent",
  "#ef4444":
    "bg-gradient-to-r from-red-100 via-red-50 to-transparent dark:from-red-950/30 dark:via-red-950/10 dark:to-transparent",
  "#0ea5e9":
    "bg-gradient-to-r from-sky-100 via-sky-50 to-transparent dark:from-sky-950/30 dark:via-sky-950/10 dark:to-transparent",
  "#a855f7":
    "bg-gradient-to-r from-purple-100 via-purple-50 to-transparent dark:from-purple-950/30 dark:via-purple-950/10 dark:to-transparent",
  "#eab308":
    "bg-gradient-to-r from-yellow-100 via-yellow-50 to-transparent dark:from-yellow-950/30 dark:via-yellow-950/10 dark:to-transparent",
  "#64748b":
    "bg-gradient-to-r from-slate-100 via-slate-50 to-transparent dark:from-slate-950/30 dark:via-slate-950/10 dark:to-transparent",
};

export const PROJECT_COLOR_ACCENT_CLASSES: Record<ProjectColor, string> = {
  "#6366f1": "border-l-indigo-500",
  "#22c55e": "border-l-green-500",
  "#f97316": "border-l-orange-500",
  "#ef4444": "border-l-red-500",
  "#0ea5e9": "border-l-sky-500",
  "#a855f7": "border-l-purple-500",
  "#eab308": "border-l-yellow-500",
  "#64748b": "border-l-slate-500",
};
