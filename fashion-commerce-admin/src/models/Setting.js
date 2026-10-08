import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    store: {
      name: { type: String, default: "VogueThreads Enterprise" },
      legalEntity: { type: String, default: "VogueThreads Fashion Retail Pvt. Ltd." },
      email: { type: String, default: "support@voguethreads.in" },
      phone: { type: String, default: "+91 98765 43210" },
      currency: { type: String, default: "INR" },
      currencySymbol: { type: String, default: "₹" },
    },
    tax: {
      gstin: { type: String, default: "27AAAAA0000A1Z5" }, // Sample Maharashtra GSTIN
      registeredState: { type: String, default: "Maharashtra" },
      registeredStateCode: { type: String, default: "27" },
      defaultHsnCode: { type: String, default: "6109" },
      defaultGstRate: { type: Number, default: 5 },
      pricesIncludeTax: { type: Boolean, default: true },
    },
    shipping: {
      defaultCourier: { type: String, default: "DELHIVERY" },
      shiprocketEnabled: { type: Boolean, default: false },
      delhiveryEnabled: { type: Boolean, default: true },
      defaultWeightGrams: { type: Number, default: 350 },
      freeShippingThreshold: { type: Number, default: 999 },
      standardShippingFee: { type: Number, default: 49 },
    },
    payments: {
      codEnabled: { type: Boolean, default: true },
      codFee: { type: Number, default: 30 },
      codMaxOrderValue: { type: Number, default: 5000 },
      razorpayEnabled: { type: Boolean, default: true },
      phonepeEnabled: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
