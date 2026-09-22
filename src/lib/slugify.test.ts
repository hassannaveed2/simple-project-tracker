import { describe, it, expect } from "vitest";
import { slugify, ensureUniqueSlug } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Client Website")).toBe("client-website");
  });

  it("collapses runs of whitespace and punctuation into a single hyphen", () => {
    expect(slugify("  Multiple   Spaces!! ")).toBe("multiple-spaces");
  });

  it("strips special characters", () => {
    expect(slugify("Special!@#Chars")).toBe("special-chars");
  });

  it("falls back to 'project' for an empty result", () => {
    expect(slugify("")).toBe("project");
    expect(slugify("😀😀😀")).toBe("project");
  });

  it("leaves an already-slugged string unchanged", () => {
    expect(slugify("already-slugged")).toBe("already-slugged");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns the base slug unchanged when it isn't taken", () => {
    expect(ensureUniqueSlug("client-website", [])).toBe("client-website");
    expect(ensureUniqueSlug("client-website", ["personal-website"])).toBe("client-website");
  });

  it("appends -2 when the base slug is taken", () => {
    expect(ensureUniqueSlug("client-website", ["client-website"])).toBe("client-website-2");
  });

  it("finds the first free numeric suffix", () => {
    expect(
      ensureUniqueSlug("client-website", ["client-website", "client-website-2"])
    ).toBe("client-website-3");
  });
});
