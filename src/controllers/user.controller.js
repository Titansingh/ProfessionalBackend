import { asyncHandler,asyncHandlerPromise } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.modal.js";

const registerUser = asyncHandlerPromise(async (req,res)=>{
   const reqBody = req.body
 

   console.log("Register User Api Is Hit",reqBody)

   if(!reqBody?.fullName?.trim()){                                                       //validation
    throw new ApiError(400, "fullName is required")
   }
   if(!reqBody?.email?.trim()){                                                          //validation
      throw new ApiError(400, "email is required")
     }
   if(!reqBody?.username?.trim()){                                                       //validation
      throw new ApiError(400, "username is required")
     }
   if(!reqBody?.password?.trim()){                                                       //validation
      throw new ApiError(400, "password is required")
     }

   const { username, email, password, fullName} = reqBody
   const avatarLocalPath = req?.files?.avatar?.[0]?.path //v.imp
   const coverImageLocalPath = req?.files?.coverImage?.[0]?.path//v.imp
   let avatarUrl = ''
   let coverImageUrl = ''

   const existedUser =  await User.findOne({
    $or: [{ username },{ email }]
    })

    if(existedUser) {
      throw new ApiError(409, "User with email or username already exist")
    }else{
      console.log("user does not exist in db")

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
      avatar:avatarUrl,
      coverImage: coverImageUrl
    })

    const createdUser = await User.findById(user._id).select(           //calling db if user is created and selecting and removing not required fields
      "-password -refreshToken"
    )
    if(!createdUser){
     throw new ApiError(500,"Something went wrong while registering the user")
    }else{
      console.log("user created")
    }

    return res.status(201).json(
      new ApiResponse(200,createdUser,"user registered sucessfull")
    )
})

export {registerUser}