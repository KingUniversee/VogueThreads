import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "INVENTORY_ADJUST", "ORDER_STATUS_UPDATE", "PRICE_CHANGE"
    resource: { type: String, required: true }, // e.g. "Product", "Inventory", "Order"
    resourceId: { type: String, required: true },
    details: {
      before: { type: mongoose.Schema.Types.Mixed },
      after: { type: mongoose.Schema.Types.Mixed },
      reason: { type: String },
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ actorEmail: 1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
