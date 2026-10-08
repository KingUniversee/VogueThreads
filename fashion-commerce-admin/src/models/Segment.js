import mongoose from "mongoose";

const SegmentRuleSchema = new mongoose.Schema({
  field: {
    type: String,
    enum: [
      "totalSpend",
      "orderCount",
      "avgOrderValue",
      "lastOrderDays",
      "status",
      "joinedDays",
    ],
    required: true,
  },
  operator: {
    type: String,
    enum: [
      "equals",
      "not_equals",
      "greater_than",
      "greater_than_or_equal",
      "less_than",
      "less_than_or_equal",
      "within_days",
    ],
    required: true,
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
});

const SegmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ["MANUAL", "RULE_BASED"],
      default: "RULE_BASED",
      required: true,
    },
    matchType: {
      type: String,
      enum: ["ALL", "ANY"],
      default: "ALL",
    },
    rules: [SegmentRuleSchema],
    customerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Customer" }],
    status: {
      type: String,
      enum: ["ACTIVE", "ARCHIVED"],
      default: "ACTIVE",
    },
    cachedMemberCount: { type: Number, default: 0 },
    lastEvaluatedAt: { type: Date },
  },
  { timestamps: true }
);

SegmentSchema.index({ status: 1 });
SegmentSchema.index({ type: 1 });
SegmentSchema.index({ createdAt: -1 });

export default mongoose.models.Segment || mongoose.model("Segment", SegmentSchema);
