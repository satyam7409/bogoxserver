import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the correct .env file path
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Debug log
console.log("MONGO_URI:", JSON.stringify(process.env.MONGO_URI));

const mongoURL = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    const connectInstance = await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(
      `✅ MongoDB Connected — DB Host: ${connectInstance.connection.host}`
    );
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
