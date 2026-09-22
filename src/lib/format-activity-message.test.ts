import { describe, it, expect } from "vitest";
import { formatActivityMessage } from "./format-activity-message";

describe("formatActivityMessage", () => {
  it("formats a project created event", () => {
    expect(
      formatActivityMessage({ type: "PROJECT_CREATED", metadata: { name: "Client Website" } })
    ).toBe('Created project "Client Website"');
  });

  it("formats a task created event", () => {
    expect(
      formatActivityMessage({
        type: "TASK_CREATED",
        metadata: { title: "Fix homepage header", projectName: "Client Website" },
      })
    ).toBe('Created task "Fix homepage header"');
  });

  it("formats a task completed event", () => {
    expect(
      formatActivityMessage({
        type: "TASK_COMPLETED",
        metadata: { title: "Fix homepage header", projectName: "Client Website" },
      })
    ).toBe('Completed "Fix homepage header"');
  });

  it("formats a task priority changed event with human-readable priority labels", () => {
    expect(
      formatActivityMessage({
        type: "TASK_PRIORITY_CHANGED",
        metadata: {
          title: "Fix homepage header",
          projectName: "Client Website",
          from: "MEDIUM",
          to: "HIGH",
        },
      })
    ).toBe('Changed "Fix homepage header" priority from Medium to High');
  });
});
