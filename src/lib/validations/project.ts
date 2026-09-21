import { z } from "zod";

export const PROJECT_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#0ea5e9",
  "#a855f7",
  "#eab308",
  "#64748b",
] as const;

export const PROJECT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
  color: z.enum(PROJECT_COLORS),
  status: z.enum(PROJECT_STATUSES),
});

export type ProjectInput = z.infer<typeof projectSchema>;
