// Generate access and refresh tokens for a user. This is the main entry point for OAuth2. The asyncHandler and asyncPromise are used to communicate with the server

import { asyncHandler, asyncHandlerPromise } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.modal.js";
import Jwt from "jsonwebtoken";
import { json } from "express";

// Function to generate access and refresh tokens for a user
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
      "Something went wrong while generating access and refresh token"
    );
  }
};

// Function to register a new user
const registerUser = asyncHandlerPromise(async (req, res) => {
  const reqBody = req.body;
  console.log("Register User Api Is Hit", reqBody);

  if (!reqBody?.fullName?.trim()) {
    // Validation: Check if fullName is provided
    throw new ApiError(400, "fullName is required");
  }
  if (!reqBody?.email?.trim()) {
    // Validation: Check if email is provided
    throw new ApiError(400, "email is required");
  }
  if (!reqBody?.username?.trim()) {
    // Validation: Check if username is provided
    throw new ApiError(400, "username is required");
  }
  if (!reqBody?.password?.trim()) {
    // Validation: Check if password is provided
    throw new ApiError(400, "password is required");
  }

  const { username, email, password, fullName } = reqBody;
  const avatarLocalPath = req?.files?.avatar?.[0]?.path; // Very important
  const coverImageLocalPath = req?.files?.coverImage?.[0]?.path; // Very important
  let avatarUrl = "";
  let coverImageUrl = "";

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  } else {
    console.log("User does not exist in the database");
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
    // Calling the database to check if the user is created and selecting and removing unnecessary fields
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  } else {
    console.log("User created");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// Function to login a user
const loginUser = asyncHandlerPromise(async (req, res) => {
  const reqBody = req.body;
  const { username, email, password } = reqBody;
  console.log("Login User Api Is Hit", req.body);

  if (!(username?.trim() || email?.trim())) {
    // Validation: Check if either username or email is provided
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
    throw new ApiError(401, "Invalid user credentials");
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
        user, // Old user not updated with access and refresh token
        accessToken,
        refreshToken,
      })
    );
});

// Function to logout a user
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
    .json(new ApiResponse(200, {}, "User logged out"));
});

// Function to refresh the access token
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
    throw ApiError(401, "Invalid refresh token");
  }
  if (incomingRefreshToken !== user?.refreshToken) {
    // Check whether the refresh token is not expired or used
    throw ApiError(401, "Refresh token expired or used");
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

// Function to change the user's password
const changePassword = asyncHandlerPromise(async (req, res) => {
  const oldPassword = req.body?.oldPassword?.trim();
  const newPassword = req.body?.newPassword?.trim();
  if (!(oldPassword || newPassword)) {
    throw new ApiError(400, "Old and new password are required");
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
    json(new ApiResponse(200, {}, "Password changed successfully"))
  );
});

// Function to get the current user
const getCurrentUser = asyncHandlerPromise(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

// Function to update user details
const updatedUserDetails = asyncHandlerPromise(async (req, res) => {
  const { fullName, username } = req.body; // Might need validation
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
      new: true, // Return updated user
    }
  ).select("-password");
  return res(200, user, "User updated successfully");
});

// Function to update user avatar
const updateUserAvatar = asyncHandlerPromise(async (req, res) => {
  // Refocus
  const newAvatarLocalPath = req.files?.path;
  if (!newAvatarLocalPath) {
    throw new ApiError(400, "New Avatar file is missing");
  }
  const newAvatar = await uploadOnCloudinary(newAvatarLocalPath);

  if (!newAvatar?.url) {
    throw new ApiError(400, "Error while uploading avatar to Cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: newAvatar.url,
      },
    },
    {
      new: true, // Return updated user
    }
  ).select("-password");
  return res.status(200, user.avatar, "User Avatar is updated");
});

// Function to get user channel profile
const getUserChannelProfile = asyncHandlerPromise(async (req, res) => {
  const { username } = req.body;
  // Add validation and error handling
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },

      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channels",
        as: "subscribers",
      },
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.usr?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exist");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
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
  getUserChannelProfile,
};
