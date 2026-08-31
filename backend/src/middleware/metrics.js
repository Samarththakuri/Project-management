import client from "prom-client";

/*
 * Prometheus instrumentation for the four golden signals.
 *
 *   Latency    -> http_request_duration_seconds (histogram)
 *   Traffic    -> rate(http_requests_total[5m])
 *   Errors     -> http_requests_total{status_code=~"5.."} / total
 *   Saturation -> process_* / nodejs_* default metrics, plus cAdvisor from the cluster
 *
 * Scraped by Prometheus directly on the pod IP via a ServiceMonitor. /metrics is
 * NOT reachable from the internet: the Ingress only routes /api to this service.
 */

const register = new client.Registry();

register.setDefaultLabels({ app: "projectcamp-backend" });
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  // Tuned for a JSON API in front of MongoDB Atlas, not for a CDN.
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

/*
 * Label cardinality is the thing that kills a Prometheus install. We only ever
 * label with the Express route *pattern* (e.g. /api/v1/projects/:projectId), never
 * the resolved URL, so an unbounded number of project ids cannot create an
 * unbounded number of time series. Requests that match no route collapse into a
 * single "unmatched" series.
 */
const routeLabel = (req) => {
  if (req.route?.path) {
    const base = req.baseUrl || "";
    const path = req.route.path === "/" ? "" : req.route.path;
    return `${base}${path}` || "/";
  }
  return "unmatched";
};

const metricsMiddleware = (req, res, next) => {
  // Do not measure the scrape itself.
  if (req.path === "/metrics") return next();

  const end = httpRequestDuration.startTimer();

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    };
    end(labels);
    httpRequestsTotal.inc(labels);
  });

  next();
};

const metricsHandler = async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};

export { metricsMiddleware, metricsHandler, register };
