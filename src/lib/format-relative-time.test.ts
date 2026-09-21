import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("returns 'just now' for under a minute ago", () => {
    const date = new Date("2026-09-21T11:59:31.000Z");
    expect(formatRelativeTime(date, now)).toBe("just now");
  });

  it("formats minutes ago", () => {
    const date = new Date("2026-09-21T11:55:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("5 minutes ago");
  });

  it("uses singular for exactly one hour ago", () => {
    const date = new Date("2026-09-21T11:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("1 hour ago");
  });

  it("formats days ago", () => {
    const date = new Date("2026-09-19T12:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("2 days ago");
  });

  it("falls back to a short date beyond a week", () => {
    const date = new Date("2026-09-01T12:00:00.000Z");
    expect(formatRelativeTime(date, now)).toBe("Sep 1");
  });
});
