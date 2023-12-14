import mongoose from "mongoose";
import  jwt  from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    watchHistory:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Video"
    }],
   // username: String, // other way below
    username : {
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true //make to true if u want to search it in more optimize way
    },
    email: {
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String,
        trim:true
    },
    coverImage:{
        type:String,
        trim:true,

    },
    password:{
        type:String,
        required:[true,'Password is required']

    },
    refreshToken:{
        type:String,
        
    },

},{timestamps:true })

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next(); //complex way to check if password is changed

    this.password = await bcrypt.hash(this.password,10)
    next()
})


//create custom method or hook
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password,this.password) //return true or false 

}
userSchema.methods.generateAccessToken =  function(){
    return jwt.sign(
        {
            _id:this._id,
            username:this.username,
            fullName:this.fullName,
            email:this.email
        },process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken =  function(){
    return jwt.sign(
        {
            _id:this._id,
            
        },process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

// User will be saved as Users beacuse mongo db saves modal with ending with S automatically if not present
export const User = mongoose.model("User",userSchema);