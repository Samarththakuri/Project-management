import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Registration sends a verification email. Mocked so the suite never opens an
// SMTP connection and never depends on Mailtrap being reachable from CI.
vi.mock("../../src/utils/mail.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailVerificationMailgenContent: vi.fn(() => ({ body: {} })),
  forgotPasswordMailgenContent: vi.fn(() => ({ body: {} })),
}));

const { sendEmail } = await import("../../src/utils/mail.js");
const { default: app } = await import("../../src/app.js");

const validUser = {
  email: "ada@example.com",
  username: "ada",
  password: "Password@123",
  fullName: "Ada Lovelace",
};

const register = (overrides = {}) =>
  request(app)
    .post("/api/v1/auth/register")
    .send({ ...validUser, ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/v1/auth/register", () => {
  it("creates a user and sends a verification email", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe("ada");
    expect(res.body.data.user.email).toBe("ada@example.com");
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("never leaks credential material in the response", async () => {
    const { body } = await register();

    // Regression guard for the field-projection bug fixed in the auth hardening
    // pass: these must never reach the client.
    expect(body.data.user.password).toBeUndefined();
    expect(body.data.user.refreshToken).toBeUndefined();
    expect(body.data.user.emailVerificationToken).toBeUndefined();
    expect(body.data.user.forgotPasswordToken).toBeUndefined();
  });

  it("rejects a duplicate username or email with 409", async () => {
    await register();
    const res = await register();

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("rejects an invalid payload with 422 before touching the database", async () => {
    const res = await register({ email: "nope", password: "short" });

    expect(res.status).toBe(422);
    expect(res.body.message).toBe("Validation failed");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/auth/login", () => {
  it("issues access and refresh cookies on valid credentials", async () => {
    await register();

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe("ada");

    const cookies = res.headers["set-cookie"].join(";");
    expect(cookies).toContain("accessToken=");
    expect(cookies).toContain("refreshToken=");
    expect(cookies).toContain("HttpOnly");
  });

  it("returns an identical 401 for a wrong password and an unknown user", async () => {
    await register();

    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: "Wrong@12345" });

    const unknownUser = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "Password@123" });

    // Identical responses are deliberate: differing ones would let an attacker
    // enumerate which addresses are registered.
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it("requires either an email or a username", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "Password@123" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/current-user", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/v1/auth/current-user");

    expect(res.status).toBe(401);
  });

  it("returns the authenticated user when a cookie is presented", async () => {
    await register();
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    const res = await request(app)
      .get("/api/v1/auth/current-user")
      .set("Cookie", login.headers["set-cookie"]);

    expect(res.status).toBe(200);
    expect(res.body.data.user?.username ?? res.body.data.username).toBe("ada");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("succeeds even without a valid token, so sign-out is idempotent", async () => {
    const res = await request(app).post("/api/v1/auth/logout");

    expect(res.status).toBe(200);
  });
});
