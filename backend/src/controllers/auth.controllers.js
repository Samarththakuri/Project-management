import { User, USER_SAFE_FIELDS } from "../model/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";

import crypto from "crypto";
import jwt from "jsonwebtoken";

// Shared cookie flags so set/clear always match (login, logout, refresh)
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

// Frontend origin used to build emailed verify/reset links.
// Derived from CORS_ORIGIN (first entry) so it points at the SPA, not the API.
const frontendBase = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")[0]
  .trim();

// Minimum gap between two verification emails for the same user.
const RESEND_COOLDOWN_MS = 60 * 1000;
// Lifetime baked into generateTemporaryToken(), used to derive when the last
// verification email went out from the stored expiry.
const TEMP_TOKEN_TTL_MS = 20 * 60 * 1000;

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating acess token",
    );
  }
};
const registerUser = asyncHandler(async (request, response) => {
  const { email, username, password, fullName } = request.body; // we destructure the data
  const userexsists = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (userexsists) {
    throw new ApiError(409, "User with email or username already exists", []);
  }
  const user = await User.create({
    email,
    password,
    username,
    fullName,
    isEmailVerified: false,
  });
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });
  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${frontendBase}/verify-email/${unHashedToken}`,
    ),
  });
  const createdUser = await User.findById(user._id).select(USER_SAFE_FIELDS);
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registring");
  }
  return response
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: createdUser },
        "User registered successfully and verification email has been sent to your email",
      ),
    );
});
const login = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;
  if (!email && !username) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  // Generic message for both unknown user and wrong password to avoid
  // leaking which emails/usernames are registered (user enumeration).
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id, //yeh mongoose ka user id unique generated hai uske hissab se token karenge hum
  );
  const loggedInUser = await User.findById(user._id).select(USER_SAFE_FIELDS);
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
        },
        "User logged successfully",
      ),
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  // Mounted behind optionalJWT: an expired or missing token still clears the
  // cookies and reports success, so signing out is always idempotent.
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: "",
        },
      },
      {
        new: true,
      },
    );
  }
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});
const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;
  if (!verificationToken) {
    throw new ApiError(400, "Email Verification token is missing");
  }
  const hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() }, //Then it checks if emailVerificationExpiry > current time
  });
  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, { isEmailVerified: true }, "Email is verified"));
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }
  // The last send time is implied by the stored expiry, so no extra field is
  // needed: expiry - TTL == when that token was issued.
  if (user.emailVerificationExpiry) {
    const lastSentAt =
      new Date(user.emailVerificationExpiry).getTime() - TEMP_TOKEN_TTL_MS;
    const elapsed = Date.now() - lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - elapsed) / 1000,
      );
      throw new ApiError(
        429,
        "Please wait before requesting another verification email",
        [{ retryAfterSeconds }],
      );
    }
  }
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });
  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${frontendBase}/verify-email/${unHashedToken}`,
    ),
  });
  const updatedUser = await User.findById(user._id).select(USER_SAFE_FIELDS);
  if (!updatedUser) {
    throw new ApiError(500, "Something went wrong while sending the email");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser },
        "Verification email sent. Check your inbox.",
      ),
    );
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }
  try {
    //If valid, it returns the decoded payload
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
    const user = await User.findById(decodedToken?._id);
    if (!user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired");
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});
const forgotPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const successResponse = new ApiResponse(
    200,
    {},
    "If an account exists for that email, a password reset link has been sent",
  );
  const user = await User.findOne({ email });
  // Always respond the same way whether or not the email exists, so we don't
  // leak which emails are registered (user enumeration).
  if (!user) {
    return res.status(200).json(successResponse);
  }
  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();
  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;
  await user.save({ validateBeforeSave: false });
  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${frontendBase}/reset-password/${unHashedToken}`,
    ),
  });
  return res.status(200).json(successResponse);
});
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }
  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;
  user.password = newPassword;
  // Invalidate existing sessions after a password reset.
  user.refreshToken = "";
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Reset Successful"));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password");
  }
  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "New password must be different from your current password",
    );
  }
  user.password = newPassword;
  // Drop the stored refresh token so sessions on other devices die with the
  // old password, then hand this browser a fresh pair so it stays signed in.
  user.refreshToken = "";
  await user.save({ validateBeforeSave: false });
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id,
  );
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
export {
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
};
