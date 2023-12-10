// require('dotenv').config({path: './env'})

import connectDB from "./db/index.js";
import app from "./app.js";
import { PORT } from "./constants.js";

connectDB()
.then(()=>{
    app.listen(PORT,() =>{
        console.log("SERVER is running at PORT: "+PORT)
    })
})
.catch((err) => {
    console.log("MONGODB connection failed !!!", err);
})

