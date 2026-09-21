import { describe, it, expect, vi } from "vitest";
import { authenticateUser } from "./authenticate-user";
import { hashPassword } from "./password";

describe("authenticateUser", () => {
  it("returns the user when credentials are valid", async () => {
    const hash = await hashPassword("supersecret1");
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user_1",
      email: "jack@example.com",
      name: "Jack",
      password: hash,
    });

    const result = await authenticateUser(
      { email: "jack@example.com", password: "supersecret1" },
      findUserByEmail
    );

    expect(result).toEqual({ id: "user_1", email: "jack@example.com", name: "Jack" });
  });

  it("returns null when the user does not exist", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(null);

    const result = await authenticateUser(
      { email: "ghost@example.com", password: "whatever1" },
      findUserByEmail
    );

    expect(result).toBeNull();
  });

  it("returns null when the password is wrong", async () => {
    const hash = await hashPassword("supersecret1");
    const findUserByEmail = vi.fn().mockResolvedValue({
      id: "user_1",
      email: "jack@example.com",
      name: "Jack",
      password: hash,
    });

    const result = await authenticateUser(
      { email: "jack@example.com", password: "wrong-password" },
      findUserByEmail
    );

    expect(result).toBeNull();
  });

  it("returns null when credentials fail schema validation, without querying", async () => {
    const findUserByEmail = vi.fn();

    const result = await authenticateUser({ email: "not-an-email" }, findUserByEmail);

    expect(result).toBeNull();
    expect(findUserByEmail).not.toHaveBeenCalled();
  });
});
