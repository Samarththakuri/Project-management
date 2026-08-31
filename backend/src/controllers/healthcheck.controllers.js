import mongoose from "mongoose";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

/*
 * Three distinct endpoints, because Kubernetes asks three different questions.
 *
 *   /api/v1/healthcheck  - the original public endpoint. Unchanged.
 *   /healthz, /healthz/live - is the process alive? Never touches MongoDB, so a
 *                        database blip can never trigger a pod restart loop.
 *   /healthz/ready       - should this pod receive traffic? Returns 503 when the
 *                        Mongoose connection is not usable, which removes the pod
 *                        from the Service endpoints and therefore from the ALB
 *                        target group.
 *
 * The ALB health check points at the shallow /healthz. Depth lives in the
 * readiness probe: with target-type "ip" the AWS Load Balancer Controller syncs
 * targets from Service endpoints, so an unready pod leaves the target group
 * regardless of what the ALB itself probes.
 */

const healthcheck = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: "Server is running" }));
});

// mongoose.connection.readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
const MONGOOSE_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const liveness = (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
  });
};

const readiness = (req, res) => {
  const state = mongoose.connection.readyState;
  const ready = state === 1;

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not-ready",
    checks: {
      mongodb: MONGOOSE_STATES[state] ?? "unknown",
    },
  });
};

export { healthcheck, liveness, readiness };
