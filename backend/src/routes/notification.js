import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controllers.js";

const router = Router();

router.route("/notifications").get(verifyJWT, getNotifications);
// read-all must come before /:id/read to prevent Express matching "read-all" as an :id
router.route("/notifications/read-all").patch(verifyJWT, markAllAsRead);
router.route("/notifications/:id/read").patch(verifyJWT, markAsRead);

export default router;
