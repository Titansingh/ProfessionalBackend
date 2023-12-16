import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config();

connectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("SERVER is running at PORT: " + process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("MONGODB connection failed !!!", err);
  });
