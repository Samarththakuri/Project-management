import { Router } from "express";
import {
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordReset,
  resetForgotPassword,
  changeCurrentPassword,
} from "../controllers/auth.controllers.js";
import { validate } from "../middleware/validator.middleware.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.schemas.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(validate(registerSchema), registerUser);
router.route("/login").post(validate(loginSchema), login);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router
  .route("/change-password")
  .post(verifyJWT, validate(changePasswordSchema), changeCurrentPassword);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/verify-email/:verificationToken").get(verifyEmail);
router
  .route("/forgot-password")
  .post(validate(forgotPasswordSchema), forgotPasswordReset);
router
  .route("/reset-password/:resetToken")
  .post(validate(resetPasswordSchema), resetForgotPassword);
router
  .route("/resend-email-verification")
  .post(verifyJWT, resendEmailVerification);

export default router;
