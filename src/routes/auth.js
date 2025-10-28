import { Router } from "express";
import { registerUser, login } from "../controllers/auth.controllers.js";
import { validate } from "../middleware/validator.middleware.js";
import {
  userloginValidation,
  userRegisterValidator,
} from "../validator/index.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
const router = Router();

router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userloginValidation(), validate, login);
router.route("/logout").post(verifyJWT, logoutuser);
export default router;
