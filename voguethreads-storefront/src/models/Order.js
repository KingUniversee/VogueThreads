import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  variantId: { type: String },
  sku: { type: String, uppercase: true, trim: true },
  title: { type: String, required: true },
  color: { type: String, default: "Standard" },
  colorHex: { type: String },
  size: { type: String, default: "Standard" },
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
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, default: "" },
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
      default: "CONFIRMED",
      required: true,
    },
    payment: {
      method: {
        type: String,
        default: "CARD",
      },
      status: {
        type: String,
        default: "PAID",
      },
      transactionId: { type: String },
      gatewayOrderId: { type: String },
      codConfirmed: { type: Boolean, default: false },
      paidAt: { type: Date, default: Date.now },
    },
    fulfillment: {
      carrier: {
        type: String,
        default: "DELHIVERY",
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
      phone: { type: String, default: "" },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: "" },
      landmark: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pinCode: { type: String, default: "" },
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
    },
    timeline: [
      {
        event: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        actorEmail: { type: String, default: "customer" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        actor: { type: String, default: "SYSTEM" },
      },
    ],
    cancellation: {
      reason: { type: String },
      cancelledBy: { type: String },
      cancelledAt: { type: Date },
      notes: { type: String },
    },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ "customerDetails.email": 1, createdAt: -1 });

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
