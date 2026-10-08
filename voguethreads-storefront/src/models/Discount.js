import mongoose from "mongoose";

const DiscountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
      default: "PERCENTAGE",
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDiscountAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    startAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ARCHIVED"],
      default: "ACTIVE",
      required: true,
    },
    priority: {
      type: Number,
      default: 10,
      min: 1,
    },
    stacking: {
      type: String,
      enum: ["EXCLUSIVE", "STACKABLE"],
      default: "EXCLUSIVE",
      required: true,
    },
    appliesTo: {
      type: String,
      enum: ["ALL_PRODUCTS", "SPECIFIC_PRODUCTS", "SPECIFIC_CATEGORIES", "SPECIFIC_COLLECTIONS"],
      default: "ALL_PRODUCTS",
      required: true,
    },
    targetIds: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

DiscountSchema.index({ status: 1, startAt: 1, endAt: 1 });

export default mongoose.models.Discount || mongoose.model("Discount", DiscountSchema);
