import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Jack",
      email: "jack@example.com",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Jack",
      email: "not-an-email",
      password: "supersecret1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Jack",
      email: "jack@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("allows an empty name", () => {
    const result = registerSchema.safeParse({
      email: "jack@example.com",
      password: "supersecret1",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "jack@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "jack@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});
