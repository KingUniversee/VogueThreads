import mongoose from "mongoose";

const InventoryTransactionSchema = new mongoose.Schema(
  {
    variantSku: { type: String, required: true, uppercase: true, trim: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "RESTOCK",
        "ORDER_RESERVED",
        "ORDER_FULFILLED",
        "ORDER_CANCELLED",
        "DAMAGE_WRITE_OFF",
        "MANUAL_ADJUSTMENT",
        "PHYSICAL_AUDIT",
        "RETURN_RESTOCK",
        "SHRINKAGE",
        "CORRECTION",
      ],
      required: true,
    },
    delta: { type: Number, required: true },
    quantityChange: { type: Number },
    previousQuantity: { type: Number },
    newQuantity: { type: Number },
    previousOnHand: { type: Number },
    newOnHand: { type: Number },
    previousAvailable: { type: Number, required: true },
    newAvailable: { type: Number, required: true },
    reason: { type: String, required: true },
    referenceId: { type: String }, // e.g. Order # or Return Ticket or PO-xxxx
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

InventoryTransactionSchema.index({ variantSku: 1, createdAt: -1 });
InventoryTransactionSchema.index({ referenceId: 1 });
InventoryTransactionSchema.index({ createdAt: -1 });
InventoryTransactionSchema.index({ type: 1 });

export default mongoose.models.InventoryTransaction ||
  mongoose.model("InventoryTransaction", InventoryTransactionSchema);
