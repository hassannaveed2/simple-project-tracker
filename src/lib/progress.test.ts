import { describe, it, expect } from "vitest";
import { computeProjectProgress } from "./progress";

describe("computeProjectProgress", () => {
  it("returns zeroes for a project with no tasks", () => {
    expect(computeProjectProgress([])).toEqual({
      completedCount: 0,
      totalCount: 0,
      percent: 0,
    });
  });

  it("returns 100 percent when every task is completed", () => {
    expect(computeProjectProgress(["COMPLETED", "COMPLETED"])).toEqual({
      completedCount: 2,
      totalCount: 2,
      percent: 100,
    });
  });

  it("returns 0 percent when no task is completed", () => {
    expect(computeProjectProgress(["TODO", "IN_PROGRESS"])).toEqual({
      completedCount: 0,
      totalCount: 2,
      percent: 0,
    });
  });

  it("rounds a partial completion ratio to the nearest whole percent", () => {
    expect(computeProjectProgress(["COMPLETED", "TODO", "TODO"])).toEqual({
      completedCount: 1,
      totalCount: 3,
      percent: 33,
    });
  });
});
