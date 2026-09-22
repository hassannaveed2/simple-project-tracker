import { describe, it, expect } from "vitest";
import { getGreeting } from "./greeting";

describe("getGreeting", () => {
  it("returns a morning greeting for early hours", () => {
    expect(getGreeting(6)).toBe("Good morning");
    expect(getGreeting(11)).toBe("Good morning");
  });

  it("returns an afternoon greeting for midday hours", () => {
    expect(getGreeting(12)).toBe("Good afternoon");
    expect(getGreeting(16)).toBe("Good afternoon");
  });

  it("returns an evening greeting for late hours", () => {
    expect(getGreeting(17)).toBe("Good evening");
    expect(getGreeting(23)).toBe("Good evening");
  });

  it("returns an evening greeting for the early hours after midnight", () => {
    expect(getGreeting(0)).toBe("Good evening");
    expect(getGreeting(4)).toBe("Good evening");
  });
});
