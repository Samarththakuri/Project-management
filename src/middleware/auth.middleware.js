import { User } from "../model/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
export const verifyJWT = asyncHandler(async (request, response, next) => {
  const token =
    request.cookies?.accessToken ||
    request.header("Authorization")?.replace("Bearer", "");

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken -emailToken -emailVerificationToken -emailVerificationExpiry",
    );
    if (!token) {
      throw new ApiError(401, "Invalid acess Token");
    }
    request.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid acess Token");
  }
});
