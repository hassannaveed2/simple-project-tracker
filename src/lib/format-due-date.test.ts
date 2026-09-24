import { describe, it, expect } from "vitest";
import { formatDueDate } from "./format-due-date";

describe("formatDueDate", () => {
  const now = new Date("2026-09-21T15:00:00.000Z");

  it("returns no label when there is no due date", () => {
    expect(formatDueDate(null, now)).toEqual({ label: null, variant: "none" });
  });

  it("labels a date earlier today as Today", () => {
    const due = new Date("2026-09-21T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Today", variant: "today" });
  });

  it("labels yesterday as Overdue", () => {
    const due = new Date("2026-09-20T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Overdue", variant: "overdue" });
  });

  it("labels tomorrow as Tomorrow with its own distinct variant", () => {
    const due = new Date("2026-09-22T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Tomorrow", variant: "tomorrow" });
  });

  it("labels a date further out with a short date", () => {
    const due = new Date("2026-09-26T00:00:00.000Z");
    expect(formatDueDate(due, now)).toEqual({ label: "Sep 26", variant: "upcoming" });
  });

  it("shows the plain date instead of Overdue for a completed task", () => {
    const due = new Date("2026-09-20T00:00:00.000Z");
    expect(formatDueDate(due, now, true)).toEqual({ label: "Sep 20", variant: "upcoming" });
  });

  it("shows the plain date instead of Today/Tomorrow for a completed task", () => {
    const dueToday = new Date("2026-09-21T00:00:00.000Z");
    expect(formatDueDate(dueToday, now, true)).toEqual({ label: "Sep 21", variant: "upcoming" });
  });
});
