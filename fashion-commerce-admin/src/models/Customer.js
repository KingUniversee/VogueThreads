import mongoose from "mongoose";

const AddressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  landmark: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pinCode: { type: String, required: true, trim: true },
  country: { type: String, default: "IN", trim: true },
  type: {
    type: String,
    enum: ["SHIPPING", "BILLING", "OTHER"],
    default: "SHIPPING",
  },
  isDefault: { type: Boolean, default: false },
});

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
      required: true,
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String },
    emailVerificationExpires: { type: Date },
    passwordResetTokenHash: { type: String },
    passwordResetExpires: { type: Date },
    pendingEmail: { type: String, lowercase: true, trim: true },
    pendingEmailTokenHash: { type: String },
    pendingEmailExpires: { type: Date },
    addresses: [AddressSchema],
    acceptsMarketing: { type: Boolean, default: false },
    tags: [{ type: String, trim: true }],
    adminNotes: [
      {
        noteId: { type: String, required: true },
        note: { type: String, required: true },
        authorEmail: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ status: 1 });
CustomerSchema.index({ emailVerified: 1 });
CustomerSchema.index({ emailVerificationTokenHash: 1 });
CustomerSchema.index({ passwordResetTokenHash: 1 });
CustomerSchema.index({ isDeleted: 1, createdAt: -1 });
CustomerSchema.index({ isDeleted: 1, status: 1 });
CustomerSchema.index({ createdAt: -1 });

export default mongoose.models.Customer || mongoose.model("Customer", CustomerSchema);
