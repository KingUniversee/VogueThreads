import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: { type: String, required: true, trim: true },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    variantSku: { type: String, uppercase: true, trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    isVerifiedBuyer: { type: Boolean, default: false },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "HIDDEN"],
      default: "PENDING",
      required: true,
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String },
      },
    ],
    adminResponse: {
      response: { type: String, trim: true },
      respondedBy: { type: String, trim: true },
      respondedAt: { type: Date },
      isPublic: { type: Boolean, default: true },
    },
    moderatedBy: { type: String, trim: true },
    moderatedAt: { type: Date },
    moderationReason: { type: String, trim: true },
    helpfulVotes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ReviewSchema.index({ productId: 1, status: 1 });
ReviewSchema.index({ customerEmail: 1 });
ReviewSchema.index({ status: 1, createdAt: -1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);
