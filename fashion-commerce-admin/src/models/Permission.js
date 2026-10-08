import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "CATALOG",
        "INVENTORY",
        "ORDERS",
        "CUSTOMERS",
        "MARKETING",
        "CONTENT",
        "ANALYTICS",
        "SYSTEM",
      ],
      required: true,
    },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

PermissionSchema.index({ category: 1 });

export default mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);
