import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import { getProjectActivity } from "../controllers/activity.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router
  .route("/:projectId/activity")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getProjectActivity);

export default router;
