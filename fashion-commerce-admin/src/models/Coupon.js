import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    normalizedCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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
    usageLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perCustomerUsageLimit: {
      type: Number,
      default: 1,
      min: 1,
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
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableCollections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Collection",
      },
    ],
    applicableCustomerSegments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Segment",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Ensure normalizedCode is always synchronized with code
CouponSchema.pre("validate", function (next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
    this.normalizedCode = this.code;
  }
  next();
});

CouponSchema.index({ status: 1, startAt: 1, endAt: 1 });
CouponSchema.index({ applicableProducts: 1 });
CouponSchema.index({ applicableCategories: 1 });
CouponSchema.index({ applicableCollections: 1 });
CouponSchema.index({ applicableCustomerSegments: 1 });

export default mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
