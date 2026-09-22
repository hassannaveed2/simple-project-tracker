import { describe, it, expect } from "vitest";
import { groupTasksByDueDate } from "./group-tasks-by-due-date";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

function makeTask(overrides: Partial<TaskListItemData> & { id: string }): TaskListItemData {
  return {
    title: "Task",
    description: "",
    notes: "",
    projectId: "p1",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    ...overrides,
  };
}

describe("groupTasksByDueDate", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("groups tasks due on the same date together", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: "2026-09-22" }),
      makeTask({ id: "2", dueDate: "2026-09-22" }),
    ];
    const groups = groupTasksByDueDate(tasks, now);
    expect(groups).toEqual([{ label: "Tomorrow", tasks: [tasks[0], tasks[1]] }]);
  });

  it("creates separate groups in date order for different due dates", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: "2026-09-22" }),
      makeTask({ id: "2", dueDate: "2026-09-26" }),
    ];
    const groups = groupTasksByDueDate(tasks, now);
    expect(groups.map((g) => g.label)).toEqual(["Tomorrow", "Sep 26"]);
  });

  it("skips tasks without a due date", () => {
    const tasks = [
      makeTask({ id: "1", dueDate: "" }),
      makeTask({ id: "2", dueDate: "2026-09-22" }),
    ];
    const groups = groupTasksByDueDate(tasks, now);
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks).toHaveLength(1);
  });
});
