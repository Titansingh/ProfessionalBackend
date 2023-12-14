// Your connection code
import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${process.env.DB_NAME}`);

        console.log("MongoDB connected", connectionInstance.connection.host);
    } catch (error) {
        console.error("MongoDB connection error", error);
        process.exit(1);
    }
};

export default connectDB;
