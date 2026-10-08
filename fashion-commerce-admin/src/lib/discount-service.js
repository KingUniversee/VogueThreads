import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Discount from "../models/Discount.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";

/**
 * Retrieve paginated discounts list with search, status, and type filtering.
 */
export async function getDiscountsList(queryParams = {}) {
  await connectToDatabase();

  const {
    search = "",
    status = "ALL",
    discountType = "ALL",
    sortBy = "priority",
    sortOrder = "asc",
    page = 1,
    limit = 10,
  } = queryParams;

  const filter = {};

  if (status && status !== "ALL") {
    filter.status = status;
  }

  if (discountType && discountType !== "ALL") {
    filter.discountType = discountType;
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    filter.$or = [
      { name: { $regex: trimmed, $options: "i" } },
      { description: { $regex: trimmed, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const sortOption = {};
  sortOption[sortBy] = sortOrder === "asc" ? 1 : -1;
  // Tie-breaker
  if (sortBy !== "createdAt") {
    sortOption.createdAt = -1;
  }

  const [discounts, total] = await Promise.all([
    Discount.find(filter)
      .populate("applicableProducts", "title slug thumbnail")
      .populate("applicableCategories", "name slug")
      .populate("applicableCollections", "name slug")
      .populate("applicableCustomerSegments", "name slug type")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Discount.countDocuments(filter),
  ]);

  return {
    discounts,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
}

/**
 * Calculate KPI metrics for the automatic discounts dashboard.
 */
export async function getDiscountMetrics() {
  await connectToDatabase();

  const now = new Date();

  const [totalDiscounts, activeDiscounts, scheduledDiscounts, expiredDiscounts] = await Promise.all([
    Discount.countDocuments(),
    Discount.countDocuments({
      status: "ACTIVE",
      startAt: { $lte: now },
      $or: [{ endAt: null }, { endAt: { $gte: now } }],
    }),
    Discount.countDocuments({
      status: "ACTIVE",
      startAt: { $gt: now },
    }),
    Discount.countDocuments({
      endAt: { $ne: null, $lt: now },
    }),
  ]);

  return {
    totalDiscounts: totalDiscounts || 0,
    activeDiscounts: activeDiscounts || 0,
    scheduledDiscounts: scheduledDiscounts || 0,
    expiredDiscounts: expiredDiscounts || 0,
  };
}

/**
 * Create a new automatic discount.
 */
export async function createDiscount(payload, actor = null) {
  await connectToDatabase();

  const name = (payload.name || "").trim();
  if (!name) {
    const err = new Error("Promotion name is required");
    err.status = 400;
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

  const discount = new Discount({
    name,
    description: payload.description || "",
    discountType: payload.discountType || "PERCENTAGE",
    discountValue,
    minimumOrderValue: Math.max(0, Number(payload.minimumOrderValue) || 0),
    maximumDiscountAmount:
      payload.maximumDiscountAmount != null && payload.maximumDiscountAmount !== ""
        ? Math.max(0, Number(payload.maximumDiscountAmount))
        : null,
    priority: Math.max(1, parseInt(payload.priority, 10) || 10),
    stacking: payload.stacking || "EXCLUSIVE",
    startAt: payload.startAt ? new Date(payload.startAt) : new Date(),
    endAt: payload.endAt ? new Date(payload.endAt) : null,
    status: payload.status || "ACTIVE",
    applicableProducts: payload.applicableProducts || [],
    applicableCategories: payload.applicableCategories || [],
    applicableCollections: payload.applicableCollections || [],
    applicableCustomerSegments: payload.applicableCustomerSegments || [],
    createdBy: actor?.id || actor?._id || undefined,
    updatedBy: actor?.id || actor?._id || undefined,
  });

  await discount.save();

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "DISCOUNT_CREATE",
      resource: "Discount",
      resourceId: String(discount._id),
      details: {
        after: discount.toObject(),
        reason: "Admin created new automatic promotion",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording discount create:", auditErr.message);
  }

  return discount;
}

/**
 * Update an existing automatic discount.
 */
export async function updateDiscount(id, payload, actor = null) {
  await connectToDatabase();

  const discount = await Discount.findById(id);
  if (!discount) {
    const err = new Error("Discount not found");
    err.status = 404;
    throw err;
  }

  const beforeData = discount.toObject();

  if (payload.name !== undefined) discount.name = payload.name.trim();
  if (payload.description !== undefined) discount.description = payload.description;
  if (payload.discountType !== undefined) discount.discountType = payload.discountType;

  if (payload.discountValue !== undefined) {
    const val = Number(payload.discountValue);
    if (isNaN(val) || val < 0) {
      const err = new Error("Discount value must be a positive number");
      err.status = 400;
      throw err;
    }
    if (discount.discountType === "PERCENTAGE" && (val <= 0 || val > 100)) {
      const err = new Error("Percentage discount must be between 1% and 100%");
      err.status = 400;
      throw err;
    }
    discount.discountValue = val;
  }

  if (payload.minimumOrderValue !== undefined) {
    discount.minimumOrderValue = Math.max(0, Number(payload.minimumOrderValue) || 0);
  }

  if (payload.maximumDiscountAmount !== undefined) {
    discount.maximumDiscountAmount =
      payload.maximumDiscountAmount != null && payload.maximumDiscountAmount !== ""
        ? Math.max(0, Number(payload.maximumDiscountAmount))
        : null;
  }

  if (payload.priority !== undefined) {
    discount.priority = Math.max(1, parseInt(payload.priority, 10) || 10);
  }

  if (payload.stacking !== undefined) {
    discount.stacking = payload.stacking;
  }

  if (payload.startAt !== undefined) {
    discount.startAt = payload.startAt ? new Date(payload.startAt) : new Date();
  }

  if (payload.endAt !== undefined) {
    discount.endAt = payload.endAt ? new Date(payload.endAt) : null;
  }

  if (payload.status !== undefined) {
    discount.status = payload.status;
  }

  if (payload.applicableProducts !== undefined) discount.applicableProducts = payload.applicableProducts;
  if (payload.applicableCategories !== undefined) discount.applicableCategories = payload.applicableCategories;
  if (payload.applicableCollections !== undefined) discount.applicableCollections = payload.applicableCollections;
  if (payload.applicableCustomerSegments !== undefined)
    discount.applicableCustomerSegments = payload.applicableCustomerSegments;

  discount.updatedBy = actor?.id || actor?._id || undefined;

  await discount.save();

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "DISCOUNT_UPDATE",
      resource: "Discount",
      resourceId: String(discount._id),
      details: {
        before: beforeData,
        after: discount.toObject(),
        reason: "Admin updated promotion rules",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording discount update:", auditErr.message);
  }

  return discount;
}

/**
 * Toggle status of an automatic discount.
 */
export async function toggleDiscountStatus(id, newStatus, actor = null) {
  await connectToDatabase();

  const discount = await Discount.findById(id);
  if (!discount) {
    const err = new Error("Discount not found");
    err.status = 404;
    throw err;
  }

  const oldStatus = discount.status;
  discount.status = newStatus;
  discount.updatedBy = actor?.id || actor?._id || undefined;
  await discount.save();

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "DISCOUNT_STATUS_CHANGE",
      resource: "Discount",
      resourceId: String(discount._id),
      details: {
        before: { status: oldStatus },
        after: { status: newStatus },
        reason: `Promotion status changed from ${oldStatus} to ${newStatus}`,
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording discount status change:", auditErr.message);
  }

  return discount;
}

/**
 * Safely delete an automatic discount.
 */
export async function deleteDiscount(id, actor = null) {
  await connectToDatabase();

  const discount = await Discount.findById(id);
  if (!discount) {
    const err = new Error("Discount not found");
    err.status = 404;
    throw err;
  }

  const historicalUsageCount = await Order.countDocuments({
    $or: [{ "pricing.appliedDiscounts.discountId": discount._id }, { "pricing.promotionSnapshot.discountId": discount._id }],
  });

  if (historicalUsageCount > 0) {
    const err = new Error(
      `Cannot delete promotion '${discount.name}' because it is linked to ${historicalUsageCount} historical order(s). Please archive it instead.`
    );
    err.status = 400;
    throw err;
  }

  await Discount.findByIdAndDelete(id);

  try {
    await AuditLog.create({
      actorId: actor?.id || actor?._id,
      actorEmail: actor?.email || "system@voguethreads.internal",
      action: "DISCOUNT_DELETE",
      resource: "Discount",
      resourceId: String(id),
      details: {
        before: discount.toObject(),
        reason: "Permanently deleted unused promotion",
      },
    });
  } catch (auditErr) {
    console.warn("⚠️ [AuditLog] Warning recording discount deletion:", auditErr.message);
  }

  return { success: true, message: `Promotion '${discount.name}' deleted successfully.` };
}
