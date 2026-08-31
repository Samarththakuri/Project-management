import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./db/index.js";

/*
 * Environment loading deliberately happens OUTSIDE this file.
 *
 * The npm scripts run `node --env-file=.env`, which populates process.env before
 * a single module is evaluated. Calling dotenv.config() here would be too late:
 * ES module imports are hoisted and fully evaluated before any statement in this
 * file runs, so app.js (CORS_ORIGIN, METRICS_ENABLED) and auth.controllers.js
 * (NODE_ENV, CORS_ORIGIN) read their module-level values first and would silently
 * ignore anything the .env file said.
 *
 * In Docker and Kubernetes there is no .env at all - the values arrive as real
 * process environment variables, which is why those paths were never affected.
 */
const port = process.env.PORT || 3000;

// How long to let in-flight requests finish before forcing the process down.
// Must stay below the pod's terminationGracePeriodSeconds (30s) so that Kubernetes
// never has to SIGKILL us.
const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 15000);

let server;
let shuttingDown = false;

/*
 * Graceful shutdown.
 *
 * Without this, a rolling update SIGKILLs the process after the grace period and
 * drops every in-flight request - so "zero downtime" would be a claim we could not
 * back up. The full sequence during a rollout is:
 *
 *   1. Kubernetes marks the pod Terminating and removes it from Service endpoints
 *   2. preStop sleeps 5s, giving the ALB time to deregister the target
 *   3. SIGTERM arrives here; we stop accepting connections and drain
 *   4. Mongoose disconnects cleanly
 *   5. Process exits 0, well inside the 30s grace period
 */
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received, shutting down gracefully`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  // Do not let this timer alone keep the event loop alive.
  forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log("HTTP server closed");
    }

    await mongoose.connection.close(false);
    console.log("MongoDB connection closed");

    clearTimeout(forceExit);
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown", err);
    clearTimeout(forceExit);
    process.exit(1);
  }
};

connectDB()
  .then(() => {
    server = app.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
