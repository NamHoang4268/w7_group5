import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.MONGODB_URL) {
    throw new Error(
        "Vui lòng cung cấp MONGODB_URL trong tệp .env"
    )
}

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
    } catch (error) {
        console.log("MongoDB connect error", error)
        process.exit(1);
    }
}

export default connectDB