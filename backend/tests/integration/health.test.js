import { describe, expect, it } from "vitest";

import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app.js";

/*
 * These endpoints are a deployment contract, not a feature. The Kubernetes
 * probes, the ALB health check and the rolling-update strategy all depend on the
 * exact status codes asserted here, so a regression must break the build.
 */
describe("liveness probes", () => {
  it.each(["/healthz", "/healthz/live"])("%s returns 200", async (path) => {
    const res = await request(app).get(path);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptime).toBe("number");
  });
});

describe("readiness probe", () => {
  it("returns 200 while MongoDB is connected", async () => {
    expect(mongoose.connection.readyState).toBe(1);

    const res = await request(app).get("/healthz/ready");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "ready",
      checks: { mongodb: "connected" },
    });
  });

  it("returns 503 when MongoDB is not connected", async () => {
    // This is the case that matters: a pod whose database connection has dropped
    // must fall out of the Service endpoints instead of serving broken traffic.
    //
    // readyState is a prototype getter on the Mongoose Connection, so it is
    // shadowed with an own property on the instance rather than spied on.
    Object.defineProperty(mongoose.connection, "readyState", {
      configurable: true,
      get: () => 0,
    });

    try {
      const res = await request(app).get("/healthz/ready");

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        status: "not-ready",
        checks: { mongodb: "disconnected" },
      });
    } finally {
      delete mongoose.connection.readyState;
    }

    expect(mongoose.connection.readyState).toBe(1);
  });
});

describe("existing healthcheck endpoint", () => {
  it("is unchanged and still answers on /api/v1/healthcheck", async () => {
    const res = await request(app).get("/api/v1/healthcheck");

    expect(res.status).toBe(200);
    expect(res.body.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe("Server is running");
  });
});
