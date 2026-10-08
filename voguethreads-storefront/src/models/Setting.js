import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    store: {
      name: { type: String, default: "VogueThreads" },
      legalEntity: { type: String, default: "VogueThreads Fashion Retail Pvt. Ltd." },
      email: { type: String, default: "concierge@voguethreads.in" },
      phone: { type: String, default: "+91 98765 43210" },
      currency: { type: String, default: "INR" },
    },
    tax: {
      gstin: { type: String, default: "27AAAAA0000A1Z5" },
      registeredState: { type: String, default: "Maharashtra" },
      registeredStateCode: { type: String, default: "27" },
      defaultHsnCode: { type: String, default: "6109" },
      defaultGstRate: { type: Number, default: 5 },
    },
    shipping: {
      defaultCourier: { type: String, default: "DELHIVERY" },
      freeShippingThreshold: { type: Number, default: 999 },
      standardShippingFee: { type: Number, default: 49 },
      estimatedDeliveryDays: { type: String, default: "3-5 Business Days" },
      returnWindowDays: { type: Number, default: 7 },
    },
    payments: {
      codEnabled: { type: Boolean, default: true },
      razorpayEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
