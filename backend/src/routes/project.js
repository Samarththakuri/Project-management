import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validator.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "../validators/project.schemas.js";
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeProjectMember,
} from "../controllers/project.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router.route("/").get(verifyJWT, getProjects);
router.route("/").post(verifyJWT, validate(createProjectSchema), createProject);

router
  .route("/:projectId")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getProjectById)
  .put(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), validate(updateProjectSchema), updateProject)
  .delete(verifyJWT, verifyProjectRole(ADMIN), deleteProject);

router
  .route("/:projectId/members")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getProjectMembers)
  .post(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), validate(addMemberSchema), addProjectMember);

router
  .route("/:projectId/members/:userId")
  .put(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), validate(updateMemberRoleSchema), updateMemberRole)
  .delete(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), removeProjectMember);

export default router;
