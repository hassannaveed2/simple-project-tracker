import { describe, it, expect } from "vitest";
import { projectSchema, PROJECT_COLORS } from "./project";

describe("projectSchema", () => {
  it("accepts a valid project payload", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      description: "Marketing site redesign",
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty description", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      description: "",
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = projectSchema.safeParse({
      name: "",
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 100 characters", () => {
    const result = projectSchema.safeParse({
      name: "a".repeat(101),
      color: PROJECT_COLORS[0],
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a color outside the fixed palette", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      color: "#000000",
      status: "ACTIVE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = projectSchema.safeParse({
      name: "Client Website",
      color: PROJECT_COLORS[0],
      status: "NOT_A_STATUS",
    });
    expect(result.success).toBe(false);
  });
});
