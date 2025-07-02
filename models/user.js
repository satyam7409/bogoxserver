import mongoose from "mongoose";
import dealSchema from "./Deal.js"; // Import the schema, not the model

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    deals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Deal" }], // if needed
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
