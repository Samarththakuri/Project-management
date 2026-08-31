import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/api-error.js";
import healthCheckRouter from "./routes/healthcheck.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import projectRouter from "./routes/project.js";
import taskRouter from "./routes/task.js";
import notificationRouter from "./routes/notification.js";
import commentRouter from "./routes/comment.js";
import globalSearchRouter from "./routes/globalsearch.js";
import dashboardRouter from "./routes/dashboard.js";
import { requestLogger } from "./middleware/logger.js";
import { metricsMiddleware, metricsHandler } from "./middleware/metrics.js";
const app = express();

// Prometheus instrumentation. First in the chain so it observes every request,
// including ones rejected by body parsers or CORS. Opt out with METRICS_ENABLED=false.
const metricsEnabled = process.env.METRICS_ENABLED !== "false";
if (metricsEnabled) {
  app.use(metricsMiddleware);
}

// Kubernetes probes. Mounted before the logger so probe traffic (every few
// seconds, per pod) does not drown the request log.
app.use("/healthz", healthRouter);

// basic configurations middleware hai
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
// cors configurations kon communicate url karega bata rha hai
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// import the routes
app.use(requestLogger);
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/projects", taskRouter);
app.use("/api/v1", notificationRouter);
app.use("/api/v1/projects", commentRouter);
app.use("/api/v1/search", globalSearchRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// Prometheus scrape target. Not exposed publicly: the Ingress only routes /api
// to this Service, so /metrics is reachable only from inside the cluster.
if (metricsEnabled) {
  app.get("/metrics", metricsHandler);
}

app.get("/", (req, res) => {
  res.send("Welcome to basecampy");
});

// eslint-disable-next-line no-unused-vars

app.use((err, req, res, next) => {
  console.error("\n========== ERROR ==========");
  console.error("URL:", req.originalUrl);
  console.error("METHOD:", req.method);
  console.error(err);
  console.error(err.stack);
  console.error("===========================\n");

  if (err instanceof ApiError) {
    return res.status(err.statuscode).json({
      statusCode: err.statuscode,
      message: err.message,
      errors: err.error,
      success: false,
    });
  }

  return res.status(500).json({
    statusCode: 500,
    message: err.message || "Internal Server Error",
    errors: [],
    success: false,
  });
});

export default app;
