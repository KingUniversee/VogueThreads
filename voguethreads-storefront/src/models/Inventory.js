import mongoose from "mongoose";

const InventorySchema = new mongoose.Schema(
  {
    variantSku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String, required: true },
    onHand: { type: Number, required: true, default: 0, min: 0 },
    reserved: { type: Number, required: true, default: 0, min: 0 },
    available: { type: Number, required: true, default: 0 },
    soldCount: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    allowBackorder: { type: Boolean, default: false },
    warehouseLocation: { type: String, default: "Main Warehouse" },
  },
  { timestamps: true }
);

InventorySchema.index({ productId: 1 });
InventorySchema.index({ available: 1 });
InventorySchema.index({ productId: 1, variantId: 1 });

export default mongoose.models.Inventory || mongoose.model("Inventory", InventorySchema);
