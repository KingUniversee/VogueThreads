import mongoose from "mongoose";

const AttributeOptionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
  hex: { type: String, default: "" },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const AttributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Fabric", "Fit", "Neckline", "Color"
    code: { type: String, required: true, unique: true, lowercase: true, trim: true }, // e.g. "fabric", "fit"
    type: {
      type: String,
      enum: ["SELECT", "MULTISELECT", "TEXT", "NUMBER", "BOOLEAN", "COLOR"],
      default: "SELECT",
    },
    description: { type: String, default: "" },
    options: [AttributeOptionSchema],
    isRequired: { type: Boolean, default: false },
    isFilterable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

AttributeSchema.index({ isActive: 1 });
AttributeSchema.index({ type: 1 });
AttributeSchema.index({ sortOrder: 1, name: 1 });

export default mongoose.models.Attribute || mongoose.model("Attribute", AttributeSchema);
