import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validator.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import {
  createCommentSchema,
  updateCommentSchema,
} from "../validators/comment.schemas.js";
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router
  .route("/:projectId/tasks/:taskId/comments")
  .get(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    getTaskComments,
  )
  .post(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    validate(createCommentSchema),
    createComment,
  );

router
  .route("/:projectId/tasks/:taskId/comments/:commentId")
  .patch(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    validate(updateCommentSchema),
    updateComment,
  )
  .delete(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    deleteComment,
  );

export default router;
