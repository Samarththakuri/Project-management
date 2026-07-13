import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { searchAll } from "../controllers/search.controllers.js";

const router = Router();

router.route("/").get(verifyJWT, searchAll);

export default router;
