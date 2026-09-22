import { formatRelativeTime } from "@/lib/format-relative-time";

export type ActivityFeedItem = {
  id: string;
  message: string;
  createdAt: Date;
};

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
          <span>{item.message}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(item.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
