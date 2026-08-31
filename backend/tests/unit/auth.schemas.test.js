import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "../../src/validators/auth.schemas.js";

describe("registerSchema", () => {
  it("accepts a valid payload and trims surrounding whitespace", () => {
    const result = registerSchema.safeParse({
      email: "  Ada@example.com ",
      username: "  ada_lovelace  ",
      password: "Password@123",
      fullName: " Ada Lovelace ",
    });

    expect(result.success).toBe(true);
    expect(result.data.email).toBe("Ada@example.com");
    expect(result.data.username).toBe("ada_lovelace");
    expect(result.data.fullName).toBe("Ada Lovelace");
  });

  it("lowercases a mixed-case username", () => {
    const result = registerSchema.safeParse({
      email: "ada@example.com",
      username: "AdaLovelace",
      password: "Password@123",
    });

    expect(result.success).toBe(true);
    expect(result.data.username).toBe("adalovelace");
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      username: "ada",
      password: "Password@123",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(
      true,
    );
  });

  it("rejects a username shorter than three characters", () => {
    const result = registerSchema.safeParse({
      email: "ada@example.com",
      username: "ad",
      password: "Password@123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a username with disallowed characters", () => {
    const result = registerSchema.safeParse({
      email: "ada@example.com",
      username: "ada lovelace",
      password: "Password@123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than eight characters", () => {
    const result = registerSchema.safeParse({
      email: "ada@example.com",
      username: "ada",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts an email and password", () => {
    expect(
      loginSchema.safeParse({ email: "ada@example.com", password: "x" })
        .success,
    ).toBe(true);
  });

  it("accepts a username and password", () => {
    expect(
      loginSchema.safeParse({ username: "ada", password: "x" }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(
      loginSchema.safeParse({ email: "ada@example.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts a genuinely different new password", () => {
    expect(
      changePasswordSchema.safeParse({
        oldPassword: "Password@123",
        newPassword: "Password@456",
      }).success,
    ).toBe(true);
  });

  it("rejects reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      oldPassword: "Password@123",
      newPassword: "Password@123",
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain("newPassword");
  });
});
