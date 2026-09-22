import { describe, it, expect } from "vitest";
import { profileSchema, passwordSchema } from "./settings";

describe("profileSchema", () => {
  it("accepts a non-empty trimmed name", () => {
    expect(profileSchema.safeParse({ name: "Jack" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(profileSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(profileSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a new password shorter than 8 characters", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched new/confirm passwords", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "oldpassword1",
      newPassword: "newpassword1",
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing current password", () => {
    const result = passwordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(false);
  });
});
