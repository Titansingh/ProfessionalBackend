import { asyncHandler,asyncHandlerPromise } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.modal.js"

const registerUser = asyncHandlerPromise(async (req,res)=>{
   //get user details from front end
   //validation -not empty
   //check if user already exists: username or email
   //check for images, check for avatar
   //upload them to cloudinary, avatar
   //create user object - create entry in db
   //remove password and refresh tome from response
   //check for user creation
   //return response
  const reqBody = req.body
  console.log("something is hit")
   if(!reqBody?.fullName?.trim()){                                                      //validation
    throw new ApiError(400, "fullName is required")
   }

//    const existedUser =  await User.findOne({
//     $or: [{ username },{ email }]
//     })

//     if(existedUser) {
//         throw new ApiError(409, "User with email or username already exist")
//     }

   
})

export {registerUser}