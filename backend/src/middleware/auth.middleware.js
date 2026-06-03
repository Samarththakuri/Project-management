import jwt from "jsonwebtoken";
import { User } from "../model/user.models.js";
import { ProjectMember } from "../model/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken -emailToken -emailVerificationToken -emailVerificationExpiry",
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, "Invalid Access Token");
  }
});

export const verifyProjectRole = (...roles) =>
  asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;
    const member = await ProjectMember.findOne({
      project: projectId,
      user: req.user._id,
    });
    if (!member) {
      throw new ApiError(403, "You are not a member of this project");
    }
    if (!roles.includes(member.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    req.projectMember = member;
    next();
  });
