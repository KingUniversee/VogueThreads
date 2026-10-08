import mongoose from "mongoose";

const CollectionProductSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    position: { type: Number, default: 0 },
  },
  { _id: false }
);

const CollectionRuleSchema = new mongoose.Schema(
  {
    field: {
      type: String,
      required: true,
      enum: ["category", "brand", "price", "status", "tag", "stock"],
    },
    operator: {
      type: String,
      required: true,
      enum: ["EQUALS", "NOT_EQUALS", "GREATER_THAN_OR_EQUAL", "LESS_THAN_OR_EQUAL", "CONTAINS", "IN"],
      default: "EQUALS",
    },
    value: { type: String, required: true },
  },
  { _id: false }
);

const CollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    type: {
      type: String,
      enum: ["MANUAL", "RULE_BASED"],
      default: "MANUAL",
    },
    products: [CollectionProductSchema],
    rules: [CollectionRuleSchema],
    ruleMatchMode: {
      type: String,
      enum: ["ALL", "ANY"],
      default: "ALL",
    },
    status: {
      type: String,
      enum: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    publishAt: { type: Date },
    unpublishAt: { type: Date },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

CollectionSchema.index({ isActive: 1, status: 1 });
CollectionSchema.index({ isFeatured: 1 });

export default mongoose.models.Collection || mongoose.model("Collection", CollectionSchema);
