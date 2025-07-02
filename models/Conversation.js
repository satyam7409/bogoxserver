// // models/Conversation.js
import mongoose from "mongoose";

// const conversationSchema = new mongoose.Schema(
//   {
//     participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
//     deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" },
//   },
//   { timestamps: true }
// );

// // Create a unique index on the combination of participants and deal
// conversationSchema.index({ participants: 1, deal: 1 }, { unique: true });

// export const Conversation =
//   mongoose.models.Conversation ||
//   mongoose.model("Conversation", conversationSchema);
const conversationSchema = new mongoose.Schema(
  {
    deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

conversationSchema.index({ deal: 1, user: 1, owner: 1 }, { unique: true });

export const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
