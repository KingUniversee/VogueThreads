import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema({
  variantId: { type: String, required: true },
  sku: { type: String, required: true, uppercase: true },
  barcode: { type: String },
  color: {
    name: { type: String, required: true },
    hex: { type: String, required: true },
    code: { type: String },
  },
  size: { type: String, required: true }, // "XS", "S", "M", "L", "XL", "XXL", "30", "32", "34", etc.
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, min: 0 },
  costPrice: { type: Number, min: 0 },
  weightGrams: { type: Number, default: 300 },
  images: [
    {
      url: { type: String, required: true },
      key: { type: String },
      alt: { type: String },
      isPrimary: { type: Boolean, default: false },
    },
  ],
  availability: {
    type: String,
    enum: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "DISCONTINUED"],
    default: "IN_STOCK",
  },
  cachedStock: {
    onHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
  },
  attributes: { type: Map, of: String, default: {} },
  isActive: { type: Boolean, default: true },
});

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    collectionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Collection" }],
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    publishAt: { type: Date },
    gender: {
      type: String,
      enum: ["MEN", "WOMEN", "UNISEX", "KIDS"],
      default: "UNISEX",
    },
    hsnCode: { type: String, default: "6109" },
    gstRate: { type: Number, enum: [5, 12, 18], default: 5 },
    primaryImages: [
      {
        url: { type: String, required: true },
        key: { type: String },
        alt: { type: String },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    variants: [VariantSchema],
    attributes: [
      {
        name: { type: String },
        value: { type: String },
      },
    ],
    careInstructions: [{ type: String }],
    tags: [{ type: String }],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

ProductSchema.index({ status: 1, categoryId: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ "variants.sku": 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ updatedAt: -1 });
ProductSchema.index({ isDeleted: 1 });
ProductSchema.index({ title: "text", description: "text", tags: "text" });

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
