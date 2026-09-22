import { cn } from "@/lib/utils";
import { PROJECT_COLOR_CARD_CLASSES } from "@/lib/project-color-styles";
import type { PROJECT_COLORS } from "@/lib/validations/project";

export function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: (typeof PROJECT_COLORS)[number];
}) {
  return (
    <div className={cn("rounded-lg border p-4", color && PROJECT_COLOR_CARD_CLASSES[color])}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
