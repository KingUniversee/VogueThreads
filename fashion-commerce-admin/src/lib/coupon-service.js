import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Coupon from "../models/Coupon.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";

/**
 * Retrieve paginated coupons list with flexible search, status, and validity filtering.
 */
export async function getCouponsList(queryParams = {}) {
  await connectToDatabase();

  const {
    search = "",
    status = "ALL",
    discountType = "ALL",
    validity = "ALL",
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = queryParams;

  const filter = {};

  // Status Filter
  if (status && status !== "ALL") {
    filter.status = status;
  }

  // Discount Type Filter
  if (discountType && discountType !== "ALL") {
    filter.discountType = discountType;
  }

  // Search Filter (Code or Description)
  if (search && search.trim()) {
    const trimmed = search.trim();
    filter.$or = [
      { code: { $regex: trimmed, $options: "i" } },
      { normalizedCode: { $regex: trimmed.toUpperCase() } },
      { description: { $regex: trimmed, $options: "i" } },
    ];
  }

  // Validity Filter (Active Now, Scheduled, Expired)
  const now = new Date();
  if (validity === "ACTIVE_NOW") {
    filter.status = "ACTIVE";
    filter.startAt = { $lte: now };
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [{ endAt: null }, { endAt: { $gte: now } }],
    });
  } else if (validity === "SCHEDULED") {
    filter.startAt = { $gt: now };
  } else if (validity === "EXPIRED") {
    filter.endAt = { $ne: null, $lt: now };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const sortOption = {};
  sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .populate("applicableProducts", "title slug thumbnail")
      .populate("applicableCategories", "name slug")
      .populate("applicableCollections", "name slug")
      .populate("applicableCustomerSegments", "name slug type")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Coupon.countDocuments(filter),
  ]);

  return {
    coupons,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

/**
 * Calculate KPI metrics for the coupons dashboard.
 */
export async function getCouponMetrics() {
  await connectToDatabase();

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [totalCoupons, activeCoupons, redemptionsAgg, discountSpendAgg, expiringSoon] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.countDocuments({ status: "ACTIVE" }),
    Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalUsage: { $sum: "$usageCount" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          "pricing.couponCode": { $exists: true, $ne: null },
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: "$pricing.discountAmount" },
        },
      },
    ]),
    Coupon.countDocuments({
      status: "ACTIVE",
      endAt: { $ne: null, $gte: now, $lte: next7Days },
    }),
  ]);

  return {
    totalCoupons: totalCoupons || 0,
    activeCoupons: activeCoupons || 0,
    totalRedemptions: redemptionsAgg[0]?.totalUsage || 0,
    totalDiscountGiven: Number((discountSpendAgg[0]?.totalDiscount || 0).toFixed(2)),
    expiringSoon: expiringSoon || 0,
  };
}

/**
 * Create a new coupon.
 */
export async function createCoupon(payload, actor = null) {
  await connectToDatabase();

  const code = (payload.code || "").trim().toUpperCase();
  if (!code) {
    const err = new Error("Coupon code is required");
    err.status = 400;
    throw err;
  }

  // Enforce case-insensitive uniqueness
  const existing = await Coupon.findOne({ normalizedCode: code });
  if (existing) {
    const err = new Error(`Coupon code '${code}' already exists`);
    err.status = 409;
    throw err;
  }

  const discountValue = Number(payload.discountValue);
  if (isNaN(discountValue) || discountValue < 0) {
    const err = new Error("Discount value must be a positive number");
    err.status = 400;
    throw err;
  }

  if (payload.discountType === "PERCENTAGE" && (discountValue <= 0 || discountValue > 100)) {
    const err = new Error("Percentage discount must be between 1% and 100%");
    err.status = 400;
    throw err;
  }

  const coupon = new Coupon({
    code,
    normalizedCode: code,
    description: payload.description || "",
    discountType: payload.discountType || "PERCENTAGE",
    discountValue,
    minimumOrderValue: Math.max(0, Number(payload.minimumOrderValue) || 0),
    maximumDiscountAmount:
      payload.maximumDiscountAmount != null && payload.maximumDiscountAmount !== ""
        ? Math.max(0, Number(payload.maximumDiscountAmount))
        : null,
    usageLimit:
      payload.usageLimit != null && payload.usageLimit !== "" ? Math.max(1, Number(payload.usageLimit)) : null,
    perCustomerUsageLimit: Math.max(1, Number(payload.perCustomerUsageLimit) || 1),
    startAt: payload.startAt ? new Date(payload.startAt) : new Date(),
    endAt: payload.endAt ? new Date(payload.endAt) : null,
    status: payload.status || "ACTIVE",
    firstOrderOnly: Boolean(payload.firstOrderOnly),
    applicableProducts: payload.applicableProducts || [],
    applicableCategories: payload.applicableCategories || [],
    applicableCollections: payload.applicableCollections || [],
    applicableCustomerSegments: payload.applicableCustomerSegments || [],
    createdBy: actor?.id || actor?._id || undefined,
    updatedBy: actor?.id || actor?._id || undefined,
  });

  await coupon.save();

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "COUPON_CREATE",
      resource: "Coupon",
      resourceId: String(coupon._id),
      details: {
        after: coupon.toObject(),
        reason: "Admin created new coupon",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording coupon create:", auditErr.message);
  }

  return coupon;
}

/**
 * Update an existing coupon.
 */
export async function updateCoupon(id, payload, actor = null) {
  await connectToDatabase();

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    const err = new Error("Coupon not found");
    err.status = 404;
    throw err;
  }

  const beforeData = coupon.toObject();

  // If code is being updated, enforce uniqueness
  if (payload.code) {
    const newCode = payload.code.trim().toUpperCase();
    if (newCode !== coupon.normalizedCode) {
      const existing = await Coupon.findOne({
        normalizedCode: newCode,
        _id: { $ne: id },
      });
      if (existing) {
        const err = new Error(`Coupon code '${newCode}' is already in use`);
        err.status = 409;
        throw err;
      }
      coupon.code = newCode;
      coupon.normalizedCode = newCode;
    }
  }

  if (payload.description !== undefined) coupon.description = payload.description;
  if (payload.discountType !== undefined) coupon.discountType = payload.discountType;

  if (payload.discountValue !== undefined) {
    const val = Number(payload.discountValue);
    if (isNaN(val) || val < 0) {
      const err = new Error("Discount value must be a positive number");
      err.status = 400;
      throw err;
    }
    if (coupon.discountType === "PERCENTAGE" && (val <= 0 || val > 100)) {
      const err = new Error("Percentage discount must be between 1% and 100%");
      err.status = 400;
      throw err;
    }
    coupon.discountValue = val;
  }

  if (payload.minimumOrderValue !== undefined) {
    coupon.minimumOrderValue = Math.max(0, Number(payload.minimumOrderValue) || 0);
  }

  if (payload.maximumDiscountAmount !== undefined) {
    coupon.maximumDiscountAmount =
      payload.maximumDiscountAmount != null && payload.maximumDiscountAmount !== ""
        ? Math.max(0, Number(payload.maximumDiscountAmount))
        : null;
  }

  if (payload.usageLimit !== undefined) {
    coupon.usageLimit =
      payload.usageLimit != null && payload.usageLimit !== "" ? Math.max(1, Number(payload.usageLimit)) : null;
  }

  if (payload.perCustomerUsageLimit !== undefined) {
    coupon.perCustomerUsageLimit = Math.max(1, Number(payload.perCustomerUsageLimit) || 1);
  }

  if (payload.startAt !== undefined) {
    coupon.startAt = payload.startAt ? new Date(payload.startAt) : new Date();
  }

  if (payload.endAt !== undefined) {
    coupon.endAt = payload.endAt ? new Date(payload.endAt) : null;
  }

  if (payload.status !== undefined) {
    coupon.status = payload.status;
  }

  if (payload.firstOrderOnly !== undefined) {
    coupon.firstOrderOnly = Boolean(payload.firstOrderOnly);
  }

  if (payload.applicableProducts !== undefined) coupon.applicableProducts = payload.applicableProducts;
  if (payload.applicableCategories !== undefined) coupon.applicableCategories = payload.applicableCategories;
  if (payload.applicableCollections !== undefined) coupon.applicableCollections = payload.applicableCollections;
  if (payload.applicableCustomerSegments !== undefined)
    coupon.applicableCustomerSegments = payload.applicableCustomerSegments;

  coupon.updatedBy = actor?.id || actor?._id || undefined;

  await coupon.save();

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "COUPON_UPDATE",
      resource: "Coupon",
      resourceId: String(coupon._id),
      details: {
        before: beforeData,
        after: coupon.toObject(),
        reason: "Admin updated coupon configuration",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording coupon update:", auditErr.message);
  }

  return coupon;
}

/**
 * Toggle or update coupon status (ACTIVE, INACTIVE, ARCHIVED).
 */
export async function toggleCouponStatus(id, newStatus, actor = null) {
  await connectToDatabase();

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    const err = new Error("Coupon not found");
    err.status = 404;
    throw err;
  }

  const oldStatus = coupon.status;
  coupon.status = newStatus;
  coupon.updatedBy = actor?.id || actor?._id || undefined;
  await coupon.save();

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "COUPON_STATUS_CHANGE",
      resource: "Coupon",
      resourceId: String(coupon._id),
      details: {
        before: { status: oldStatus },
        after: { status: newStatus },
        reason: `Status changed from ${oldStatus} to ${newStatus}`,
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording coupon status toggle:", auditErr.message);
  }

  return coupon;
}

/**
 * Safely delete or archive a coupon.
 * If the coupon has historical order references, rejection occurs with guidance to archive.
 */
export async function deleteCoupon(id, actor = null) {
  await connectToDatabase();

  const coupon = await Coupon.findById(id);
  if (!coupon) {
    const err = new Error("Coupon not found");
    err.status = 404;
    throw err;
  }

  // Safety check: is it referenced by historical orders?
  const historicalOrdersCount = await Order.countDocuments({
    $or: [{ "pricing.couponCode": coupon.normalizedCode }, { "pricing.promotionSnapshot.couponId": coupon._id }],
  });

  if (historicalOrdersCount > 0) {
    const err = new Error(
      `Cannot permanently delete coupon '${coupon.code}' because it has been applied to ${historicalOrdersCount} historical order(s). Please archive it instead to preserve accounting records.`
    );
    err.status = 400;
    throw err;
  }

  await Coupon.findByIdAndDelete(id);

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "COUPON_DELETE",
      resource: "Coupon",
      resourceId: String(id),
      details: {
        before: coupon.toObject(),
        reason: "Permanently deleted unused coupon",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording coupon deletion:", auditErr.message);
  }

  return { success: true, message: `Coupon '${coupon.code}' has been permanently deleted.` };
}

/**
 * Concurrency-safe atomic usage increment when an order completes checkout.
 */
export async function recordCouponRedemptionAtomic(couponCode) {
  if (!couponCode) return null;

  await connectToDatabase();
  const normalized = couponCode.trim().toUpperCase();

  // Atomically increment usageCount ONLY IF usageLimit is null OR usageCount < usageLimit
  const updatedCoupon = await Coupon.findOneAndUpdate(
    {
      normalizedCode: normalized,
      status: "ACTIVE",
      $or: [{ usageLimit: null }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }],
    },
    {
      $inc: { usageCount: 1 },
    },
    { new: true }
  );

  return updatedCoupon;
}
