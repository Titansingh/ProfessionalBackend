import { asyncHandler, asyncHandlerPromise } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.modal.js";
import Jwt from "jsonwebtoken.js";
import { json } from "express";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.accessToken = accessToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating acess and refresh token"
    );
  }
};

const registerUser = asyncHandlerPromise(async (req, res) => {
  console.log("Register User Api Is Hit", reqBody);

  const reqBody = req.body;

  if (!reqBody?.fullName?.trim()) {
    //validation
    throw new ApiError(400, "fullName is required");
  }
  if (!reqBody?.email?.trim()) {
    //validation
    throw new ApiError(400, "email is required");
  }
  if (!reqBody?.username?.trim()) {
    //validation
    throw new ApiError(400, "username is required");
  }
  if (!reqBody?.password?.trim()) {
    //validation
    throw new ApiError(400, "password is required");
  }

  const { username, email, password, fullName } = reqBody;
  const avatarLocalPath = req?.files?.avatar?.[0]?.path; //v.imp
  const coverImageLocalPath = req?.files?.coverImage?.[0]?.path; //v.imp
  let avatarUrl = "";
  let coverImageUrl = "";

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  } else {
    console.log("user does not exist in db");
  }

  // Upload avatar to Cloudinary if it exists
  if (avatarLocalPath) {
    const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
    avatarUrl = avatarUpload.url;
  }

  // Upload cover image to Cloudinary if it exists
  if (coverImageLocalPath) {
    const coverImageUpload = await uploadOnCloudinary(coverImageLocalPath);
    coverImageUrl = coverImageUpload.url;
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatarUrl,
    coverImage: coverImageUrl,
  });

  const createdUser = await User.findById(user._id).select(
    //calling db if user is created and selecting and removing not required fields
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  } else {
    console.log("user created");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered sucessfull"));
});

const loginUser = asyncHandlerPromise(async (req, res) => {
  console.log("Login User Api Is Hit", reqBody);

  const { username, email, password } = req.body;

  if (!(username.trim() || email.trim())) {
    //validation
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  } else {
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, {
        user, //old user not updated with acess and refresh token
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandlerPromise(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {}, "User logedout"));
});

const refreshAccessToken = asyncHandlerPromise(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw ApiError(401, "Unauthorized request");
  }
  const decodedIncomingRefreshToken = Jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedIncomingRefreshToken._id);
  if (user) {
    throw ApiError(401, "Invalid refresh Token");
  }
  if (incomingRefreshToken !== user?.refreshToken) {
    //check weather the refresh token is not expired or used
    throw ApiError(401, "refresh Token expired or used");
  }
  const newRefreshToken = await user.generateAccessToken();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { refreshToken: newRefreshToken },
        "New access token"
      )
    );
});

const changePassword = asyncHandlerPromise(async (req, res) => {
  const oldPassword = req.body?.oldPassword?.trim();
  const newPassword = req.body?.newPassword?.trim();
  if (!(oldPassword || newPassword)) {
    throw new ApiError(400, "old and new password is required");
  }

  const user = await User.findById(req?.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return (
    res.status(200),
    json(new ApiResponse(200, {}, "password changed successfully"))
  );
});

const getCurrentUser = asyncHandlerPromise(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

const updatedUserDetails = asyncHandlerPromise(async (req, res) => {
  const { fullName, username } = req.body; //might need validation
  let newUser = {};
  if (fullName) {
    newUser.fullName = fullName;
  }
  if (username) {
    newUser.username = username;
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: newUser,
    },
    {
      new: true, //return updated user
    }
  ).select("-password");
  return res(200, user, "User updated successfully");
});

const updateUserAvatar = asyncHandlerPromise(async (req, res) => {
  //refocus
  const newAvatarLocalPath = req.files?.path;
  if (!newAvatarLocalPath) {
    throw new ApiError(400, "New Avatar file is missing");
  }
  const newAvatar = await uploadOnCloudinary(newAvatarLocalPath);

  if (!newAvatar?.url) {
    throw new ApiError(400, "Error while uploading avatar to cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: newAvatar.url,
      },
    },
    {
      new: true, //return updated user
    }
  ).select("-password");
  return res.status(200, user.avatar, "User Avatar is updated");
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updatedUserDetails,
  updateUserAvatar,
};
