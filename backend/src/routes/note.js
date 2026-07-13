import { Router } from "express";
import { verifyJWT, verifyProjectRole } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validator.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";
import {
  createNoteSchema,
  updateNoteSchema,
} from "../validators/note.schemas.js";
import {
  getProjectNotes,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
} from "../controllers/note.controllers.js";

const { ADMIN, PROJECT_ADMIN, MEMBER } = UserRolesEnum;
const router = Router();

router
  .route("/:projectId/notes")
  .get(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER),
    getProjectNotes,
  )
  .post(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(createNoteSchema),
    createNote,
  );

router
  .route("/:projectId/notes/:noteId")
  .get(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN, MEMBER), getNoteById)
  .patch(
    verifyJWT,
    verifyProjectRole(ADMIN, PROJECT_ADMIN),
    validate(updateNoteSchema),
    updateNote,
  )
  .delete(verifyJWT, verifyProjectRole(ADMIN, PROJECT_ADMIN), deleteNote);

export default router;
