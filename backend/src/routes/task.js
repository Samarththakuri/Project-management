import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validator.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
} from "../validators/task.schemas.js";
import {
  getProjectTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  reorderTasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
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
    upload.array("attachments", 5),
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

router
  .route("/:projectId/tasks/:taskId/subtasks")
  .post(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(createSubtaskSchema),
    createSubtask,
  );

router
  .route("/:projectId/tasks/:taskId/subtasks/:subTaskId")
  .patch(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    validate(updateSubtaskSchema),
    updateSubtask,
  )
  .delete(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), deleteSubtask);

export default router;
