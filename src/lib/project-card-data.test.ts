import { describe, it, expect } from "vitest";
import { toProjectCardData } from "./project-card-data";

describe("toProjectCardData", () => {
  it("maps a project with tasks into card data", () => {
    const result = toProjectCardData({
      id: "p1",
      slug: "client-website",
      name: "Client Website",
      description: "A site",
      color: "#6366f1",
      status: "ACTIVE",
      updatedAt: new Date("2026-09-20T00:00:00.000Z"),
      tasks: [{ status: "COMPLETED" }, { status: "TODO" }],
    });

    expect(result).toEqual({
      id: "p1",
      slug: "client-website",
      name: "Client Website",
      description: "A site",
      color: "#6366f1",
      status: "ACTIVE",
      completedCount: 1,
      totalCount: 2,
      percent: 50,
      updatedAtLabel: expect.any(String),
    });
  });

  it("defaults a null description to an empty string", () => {
    const result = toProjectCardData({
      id: "p2",
      slug: "personal",
      name: "Personal",
      description: null,
      color: "#22c55e",
      status: "ACTIVE",
      updatedAt: new Date(),
      tasks: [],
    });

    expect(result.description).toBe("");
    expect(result.totalCount).toBe(0);
    expect(result.percent).toBe(0);
  });
});
