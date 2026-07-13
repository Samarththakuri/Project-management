import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getUserDashboard,
  getUserActivity,
} from "../controllers/dashboard.controllers.js";

const router = Router();

router.route("/").get(verifyJWT, getUserDashboard);
router.route("/activity").get(verifyJWT, getUserActivity);

export default router;
