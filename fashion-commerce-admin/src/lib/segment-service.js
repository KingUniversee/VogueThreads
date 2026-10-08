import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Segment from "../models/Segment.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";
import { getCustomerPurchasingMetrics } from "./customer-service.js";

/**
 * Evaluate a single dynamic rule against a customer and their purchasing metrics
 */
export function evaluateRule(rule, customer, metrics) {
  const { field, operator, value } = rule;
  const numValue = Number(value);

  let targetValue;
  switch (field) {
    case "totalSpend":
      targetValue = metrics.totalSpend || 0;
      break;
    case "orderCount":
      targetValue = metrics.totalOrders || 0;
      break;
    case "avgOrderValue":
      targetValue = metrics.avgOrderValue || 0;
      break;
    case "lastOrderDays":
      if (!metrics.lastOrderDate) return false;
      const lastOrderTime = new Date(metrics.lastOrderDate).getTime();
      targetValue = Math.floor((Date.now() - lastOrderTime) / (1000 * 60 * 60 * 24));
      break;
    case "status":
      targetValue = customer.status;
      break;
    case "joinedDays":
      const joinedTime = new Date(customer.createdAt).getTime();
      targetValue = Math.floor((Date.now() - joinedTime) / (1000 * 60 * 60 * 24));
      break;
    default:
      return true;
  }

  switch (operator) {
    case "equals":
      return targetValue === value || String(targetValue).toLowerCase() === String(value).toLowerCase();
    case "not_equals":
      return targetValue !== value && String(targetValue).toLowerCase() !== String(value).toLowerCase();
    case "greater_than":
      return Number(targetValue) > numValue;
    case "greater_than_or_equal":
      return Number(targetValue) >= numValue;
    case "less_than":
      return Number(targetValue) < numValue;
    case "less_than_or_equal":
      return Number(targetValue) <= numValue;
    case "within_days":
      return Number(targetValue) <= numValue;
    default:
      return true;
  }
}

/**
 * Evaluate if a customer belongs to a segment
 */
export function doesCustomerMatchSegment(customer, segment, metrics) {
  if (segment.type === "MANUAL") {
    return (segment.customerIds || []).some(
      (id) => String(id) === String(customer._id)
    );
  }

  // Rule-based segment
  const rules = segment.rules || [];
  if (rules.length === 0) return true;

  if (segment.matchType === "ANY") {
    return rules.some((rule) => evaluateRule(rule, customer, metrics));
  } else {
    // Default: ALL (AND logic)
    return rules.every((rule) => evaluateRule(rule, customer, metrics));
  }
}

/**
 * Fetch member count and matching customer IDs for a segment
 */
export async function getSegmentMembers(segmentId, { page = 1, limit = 20, search = "" } = {}) {
  await connectToDatabase();

  const segment = await Segment.findById(segmentId);
  if (!segment) {
    const err = new Error(`Segment '${segmentId}' not found`);
    err.status = 404;
    throw err;
  }

  if (segment.type === "MANUAL") {
    const filter = {
      _id: { $in: segment.customerIds || [] },
      isDeleted: { $ne: true },
    };

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    const total = await Customer.countDocuments(filter);
    const customers = await Customer.find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    // Attach real purchasing metrics for each customer
    const membersWithMetrics = await Promise.all(
      customers.map(async (c) => {
        const metrics = await getCustomerPurchasingMetrics(c._id, c.email);
        return { ...c, metrics };
      })
    );

    return {
      segment,
      members: membersWithMetrics,
      totalCount: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // Rule-based segment: evaluate against active customers
  const customers = await Customer.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();

  const matchingMembers = [];

  for (const c of customers) {
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      if (!regex.test(c.name) && !regex.test(c.email) && !regex.test(c.phone || "")) {
        continue;
      }
    }

    const metrics = await getCustomerPurchasingMetrics(c._id, c.email);
    if (doesCustomerMatchSegment(c, segment, metrics)) {
      matchingMembers.push({ ...c, metrics });
    }
  }

  const total = matchingMembers.length;
  const paginatedMembers = matchingMembers.slice((page - 1) * limit, page * limit);

  // Update cached count
  segment.cachedMemberCount = total;
  segment.lastEvaluatedAt = new Date();
  await segment.save();

  return {
    segment,
    members: paginatedMembers,
    totalCount: total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
