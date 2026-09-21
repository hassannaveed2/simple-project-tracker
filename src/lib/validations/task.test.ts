import { describe, it, expect } from "vitest";
import { taskSchema } from "./task";

describe("taskSchema", () => {
  const validBase = {
    title: "Fix homepage header",
    projectId: "project_123",
    priority: "MEDIUM" as const,
    status: "TODO" as const,
  };

  it("accepts a minimal valid payload", () => {
    const result = taskSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts optional fields when provided", () => {
    const result = taskSchema.safeParse({
      ...validBase,
      description: "Some description",
      notes: "Some notes",
      dueDate: "2026-09-25",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = taskSchema.safeParse({ ...validBase, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = taskSchema.safeParse({ ...validBase, title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects a missing projectId", () => {
    const result = taskSchema.safeParse({ ...validBase, projectId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority", () => {
    const result = taskSchema.safeParse({ ...validBase, priority: "SUPER_URGENT" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = taskSchema.safeParse({ ...validBase, status: "DONE" });
    expect(result.success).toBe(false);
  });
});
