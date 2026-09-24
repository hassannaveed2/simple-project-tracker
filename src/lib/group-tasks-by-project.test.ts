import { describe, it, expect } from "vitest";
import { groupTasksByProject } from "./group-tasks-by-project";
import type { TaskListItemData } from "@/components/tasks/task-list-item";

function makeTask(
  overrides: Partial<TaskListItemData> & { id: string; projectId: string } & {
    projectName: string;
    projectColor: string;
  }
): TaskListItemData & { projectName: string; projectColor: string } {
  return {
    title: "Task",
    description: "",
    notes: "",
    priority: "MEDIUM",
    status: "TODO",
    order: 0,
    dueDate: "",
    ...overrides,
  };
}

describe("groupTasksByProject", () => {
  it("groups tasks under the same project together", () => {
    const tasks = [
      makeTask({ id: "1", projectId: "p1", projectName: "Client Website", projectColor: "#6366f1" }),
      makeTask({ id: "2", projectId: "p1", projectName: "Client Website", projectColor: "#6366f1" }),
    ];
    const groups = groupTasksByProject(tasks);
    expect(groups).toEqual([
      {
        projectId: "p1",
        projectName: "Client Website",
        projectColor: "#6366f1",
        tasks: [tasks[0], tasks[1]],
      },
    ]);
  });

  it("creates separate groups per project, preserving first-seen order", () => {
    const tasks = [
      makeTask({ id: "1", projectId: "p2", projectName: "Personal Website", projectColor: "#22c55e" }),
      makeTask({ id: "2", projectId: "p1", projectName: "Client Website", projectColor: "#6366f1" }),
    ];
    const groups = groupTasksByProject(tasks);
    expect(groups.map((g) => g.projectId)).toEqual(["p2", "p1"]);
  });

  it("returns an empty array for no tasks", () => {
    expect(groupTasksByProject([])).toEqual([]);
  });
});
