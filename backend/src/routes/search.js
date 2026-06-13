import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import { searchProject } from "../controllers/search.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router
  .route("/:projectId/search")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), searchProject);

export default router;
