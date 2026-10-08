import mongoose from "mongoose";

const BrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoUrl: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    description: { type: String, default: "" },
    website: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
    },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

BrandSchema.index({ isActive: 1 });
BrandSchema.index({ createdAt: -1 });
BrandSchema.index({ updatedAt: -1 });

export default mongoose.models.Brand || mongoose.model("Brand", BrandSchema);
