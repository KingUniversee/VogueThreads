import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: String, required: true },
  sku: { type: String, required: true, uppercase: true, trim: true },
  title: { type: String, required: true },
  color: { type: String, required: true },
  colorHex: { type: String },
  size: { type: String, required: true },
  image: { type: String },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true },
  hsnCode: { type: String, default: "6109" },
  gstRate: { type: Number, default: 5 },
  taxAmount: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  total: { type: Number, required: true },
});

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    customerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "PAID",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "FAILED",
        "RETURNED",
        "REFUNDED",
      ],
      default: "PENDING_PAYMENT",
      required: true,
    },
    payment: {
      method: {
        type: String,
        enum: ["COD", "RAZORPAY", "PHONEPE", "CASHFREE", "CARD", "NET_BANKING", "UPI", "WALLET"],
        required: true,
      },
      status: {
        type: String,
        enum: ["PENDING", "AUTHORIZED", "CAPTURED", "PAID", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED"],
        default: "PENDING",
      },
      transactionId: { type: String },
      gatewayOrderId: { type: String },
      codConfirmed: { type: Boolean, default: false },
      paidAt: { type: Date },
    },
    fulfillment: {
      carrier: {
        type: String,
        enum: ["DELHIVERY", "SHIPROCKET", "BLUEDART", "XPRESSBEES", "DTDC", "SHADOWFAX", "OTHER"],
      },
      awbNumber: { type: String, trim: true },
      trackingUrl: { type: String, trim: true },
      shippingLabelUrl: { type: String },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
      estimatedDelivery: { type: Date },
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pinCode: { type: String, required: true },
      country: { type: String, default: "IN" },
    },
    billingAddress: {
      fullName: { type: String },
      phone: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      city: { type: String },
      state: { type: String },
      pinCode: { type: String },
      country: { type: String, default: "IN" },
      gstin: { type: String, uppercase: true, trim: true },
    },
    items: [OrderItemSchema],
    pricing: {
      subtotal: { type: Number, required: true },
      discountAmount: { type: Number, default: 0 },
      couponCode: { type: String, uppercase: true, trim: true },
      shippingFee: { type: Number, default: 0 },
      codFee: { type: Number, default: 0 },
      taxBreakdown: {
        cgstTotal: { type: Number, default: 0 },
        sgstTotal: { type: Number, default: 0 },
        igstTotal: { type: Number, default: 0 },
        totalTax: { type: Number, default: 0 },
      },
      grandTotal: { type: Number, required: true },
      currency: { type: String, default: "INR" },
      promotionSnapshot: {
        couponId: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon" },
        couponCode: { type: String, uppercase: true, trim: true },
        discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount" },
        discountType: { type: String },
        discountValue: { type: Number },
        discountAmount: { type: Number, default: 0 },
        name: { type: String },
        ruleSummary: { type: String },
        appliedAt: { type: Date, default: Date.now },
      },
      appliedDiscounts: [
        {
          discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount" },
          name: { type: String },
          discountType: { type: String },
          discountValue: { type: Number },
          discountAmount: { type: Number },
        },
      ],
    },
    // Idempotent warehouse stock tracking state
    inventoryState: {
      reserved: { type: Boolean, default: false },
      committed: { type: Boolean, default: false },
      released: { type: Boolean, default: false },
      restocked: { type: Boolean, default: false },
    },
    cancellation: {
      reason: { type: String },
      cancelledBy: { type: String },
      cancelledAt: { type: Date },
      notes: { type: String },
    },
    returns: [
      {
        returnId: { type: String, required: true },
        items: [
          {
            sku: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            reason: { type: String, required: true },
            condition: { type: String, default: "GOOD" }, // GOOD, DAMAGED, DEFECTIVE
          },
        ],
        status: {
          type: String,
          enum: ["REQUESTED", "APPROVED", "RECEIVED", "RESTOCKED", "REJECTED"],
          default: "REQUESTED",
        },
        refundAmount: { type: Number, default: 0 },
        requestedAt: { type: Date, default: Date.now },
        processedAt: { type: Date },
        restocked: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    refunds: [
      {
        refundId: { type: String, required: true },
        amount: { type: Number, required: true },
        reason: { type: String, required: true },
        status: {
          type: String,
          enum: ["PENDING", "PROCESSED", "FAILED"],
          default: "PROCESSED",
        },
        reference: { type: String },
        initiatedAt: { type: Date, default: Date.now },
        actorEmail: { type: String, required: true },
      },
    ],
    // Chronological event timeline
    timeline: [
      {
        event: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        actorEmail: { type: String, default: "system" },
        timestamp: { type: Date, default: Date.now },
        metadata: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    // Backward-compatible status history
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        actor: { type: String, default: "SYSTEM" },
      },
    ],
    // Staff internal notes thread
    adminNotes: [
      {
        noteId: { type: String },
        note: { type: String, required: true },
        authorEmail: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ createdAt: -1, status: 1 });
OrderSchema.index({ "customerDetails.email": 1, status: 1 });
OrderSchema.index({ "customerDetails.email": 1, createdAt: -1 });
OrderSchema.index({ "payment.status": 1 });
OrderSchema.index({ "payment.method": 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
