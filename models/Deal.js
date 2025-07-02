import mongoose from "mongoose";
//updated the deal
const dealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    area: { type: String, required: true },
    productPrice: { type: Number, required: true },
    hasMembership: { type: Boolean, default: false },
    additionalInfo: { type: String, default: null },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Deal = mongoose.models.Deal || mongoose.model("Deal", dealSchema);
export default dealSchema;
