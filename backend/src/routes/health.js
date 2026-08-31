import { Router } from "express";
import { liveness, readiness } from "../controllers/healthcheck.controllers.js";

/*
 * Mounted at /healthz (outside /api/v1) so that probe traffic is not routed to
 * the backend by the Ingress /api path rule, and so the frontend container can
 * answer the same path for its own target group.
 */
const router = Router();

router.route("/").get(liveness);
router.route("/live").get(liveness);
router.route("/ready").get(readiness);

export default router;
