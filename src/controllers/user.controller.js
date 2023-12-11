import { asyncHandler,asyncHandlerPromise } from "../utils/asyncHandler.js";

const registerUser = asyncHandlerPromise(async (req,res)=>{
    res.status(200).json({
        message:"user registered"
    })
})

export {registerUser}