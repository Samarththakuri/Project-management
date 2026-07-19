import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validator.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
} from "../validators/task.schemas.js";
import {
  getProjectTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks,
  getProjectCalendar,
} from "../controllers/task.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router
  .route("/:projectId/tasks")
  .get(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    getProjectTasks,
  )
  .post(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(createTaskSchema),
    createTask,
  );

router
  .route("/:projectId/tasks/calendar")
  .get(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    getProjectCalendar,
  );

router
  .route("/:projectId/tasks/reorder")
  .patch(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(reorderTasksSchema),
    reorderTasks,
  );

router
  .route("/:projectId/tasks/:taskId")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getTaskById)
  .patch(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(updateTaskSchema),
    updateTask,
  )
  .delete(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), deleteTask);

export default router;
