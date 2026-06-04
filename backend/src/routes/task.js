import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validator.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import {
  createTaskSchema,
  updateTaskSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
} from "../validators/task.schemas.js";
import {
  getProjectTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
} from "../controllers/task.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router
  .route("/:projectId")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getProjectTasks)
  .post(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    upload.array("attachments", 5),
    validate(createTaskSchema),
    createTask,
  );

router
  .route("/:projectId/t/:taskId")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getTaskById)
  .put(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(updateTaskSchema),
    updateTask,
  )
  .delete(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), deleteTask);

router
  .route("/:projectId/t/:taskId/subtasks")
  .post(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(createSubtaskSchema),
    createSubtask,
  );

router
  .route("/:projectId/st/:subTaskId")
  .put(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    validate(updateSubtaskSchema),
    updateSubtask,
  )
  .delete(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), deleteSubtask);

export default router;
