import { ApiError } from "../utils/ApiError";
import { asyncHandlerPromise } from "../utils/asyncHandler";
import { Jwt } from "jsonwebtoken";
import { User } from "../models/user.modal";

export const verifyJwt = asyncHandlerPromise(async (req, res, next) => {
  try {
    const jwtToken =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!jwtToken) {
      throw new ApiError(401, "Unauthorised request");
    }

    const decodedToken = Jwt.verify(jwtToken, process.env.ACCESS_TOKEN_SECRET); //may need to add await

    const user = User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
