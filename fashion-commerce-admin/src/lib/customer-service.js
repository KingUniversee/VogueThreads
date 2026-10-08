import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";

/**
 * Idempotent self-healing utility:
 * Ensures every unique customer who placed an Order has a Customer CRM record.
 */
export async function syncCustomersFromOrders() {
  await connectToDatabase();

  const distinctEmails = await Order.distinct("customerDetails.email");
  const validEmails = distinctEmails
    .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
    .filter(Boolean);

  if (validEmails.length === 0) return 0;

  // Find existing customers in a single batch query
  const existingCustomers = await Customer.find({ email: { $in: validEmails } })
    .select("email")
    .lean();
  const existingEmailSet = new Set(existingCustomers.map((c) => c.email.toLowerCase()));

  // Identify truly missing emails
  const missingEmails = validEmails.filter((email) => !existingEmailSet.has(email));
  if (missingEmails.length === 0) return 0;

  let createdCount = 0;

  for (const cleanEmail of missingEmails) {
    // Fetch the most recent order for this email to seed initial profile & address
    const latestOrder = await Order.findOne({ "customerDetails.email": cleanEmail })
      .sort({ createdAt: -1 })
      .lean();

    if (!latestOrder) continue;

    const shipping = latestOrder.shippingAddress || {};

    const addresses = [];
    if (shipping.addressLine1 && shipping.city) {
      addresses.push({
        fullName: shipping.fullName || latestOrder.customerDetails?.name || "Customer",
        phone: shipping.phone || latestOrder.customerDetails?.phone || "",
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || "",
        landmark: shipping.landmark || "",
        city: shipping.city,
        state: shipping.state || "",
        pinCode: shipping.pinCode || "",
        country: shipping.country || "IN",
        type: "SHIPPING",
        isDefault: true,
      });
    }

    try {
      await Customer.create({
        name: latestOrder.customerDetails?.name || "Customer",
        email: cleanEmail,
        phone: latestOrder.customerDetails?.phone || "",
        status: "ACTIVE",
        addresses,
        acceptsMarketing: true,
        tags: [],
        adminNotes: [],
      });
      createdCount++;
    } catch (err) {
      // Ignore duplicate key race conditions
      if (err.code !== 11000) {
        console.warn("⚠️ [CustomerSync] Failed to sync customer:", err.message);
      }
    }
  }

  return createdCount;
}

/**
 * Calculate customer purchasing metrics strictly from live Order documents
 * Excludes CANCELLED and FAILED orders from valid spend and counts.
 */
export async function getCustomerPurchasingMetrics(customerId, email) {
  await connectToDatabase();

  const matchFilter = {
    status: { $nin: ["CANCELLED", "FAILED"] },
  };

  const orClauses = [];
  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
    orClauses.push({ customerId: new mongoose.Types.ObjectId(customerId) });
  }
  if (email && email.trim()) {
    orClauses.push({ "customerDetails.email": email.trim().toLowerCase() });
  }

  if (orClauses.length > 0) {
    matchFilter.$or = orClauses;
  } else {
    return {
      totalOrders: 0,
      totalSpend: 0,
      avgOrderValue: 0,
      itemsPurchased: 0,
      firstOrderDate: null,
      lastOrderDate: null,
      cancelledOrders: 0,
    };
  }

  const [validAgg, cancelAgg] = await Promise.all([
    Order.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: "$pricing.grandTotal" },
          itemsPurchased: { $sum: { $size: { $ifNull: ["$items", []] } } },
          firstOrderDate: { $min: "$createdAt" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
    ]),
    Order.countDocuments({
      $or: orClauses,
      status: "CANCELLED",
    }),
  ]);

  const stats = validAgg[0] || {};
  const totalOrders = stats.totalOrders || 0;
  const totalSpend = Math.round(stats.totalSpend || 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 0;

  return {
    totalOrders,
    totalSpend,
    avgOrderValue,
    itemsPurchased: stats.itemsPurchased || 0,
    firstOrderDate: stats.firstOrderDate || null,
    lastOrderDate: stats.lastOrderDate || null,
    cancelledOrders: cancelAgg || 0,
  };
}

/**
 * Calculate purchasing metrics for a batch of customers in 1 or 2 aggregate queries
 * instead of 2 * N separate database queries.
 */
export async function getBatchCustomerPurchasingMetrics(customers = []) {
  if (!customers || customers.length === 0) return new Map();
  await connectToDatabase();

  const customerIdMap = new Map();
  const emailMap = new Map();
  const results = new Map();

  for (const c of customers) {
    const idStr = c._id?.toString();
    const cleanEmail = typeof c.email === "string" ? c.email.trim().toLowerCase() : "";

    const defaultMetric = {
      totalOrders: 0,
      totalSpend: 0,
      avgOrderValue: 0,
      itemsPurchased: 0,
      firstOrderDate: null,
      lastOrderDate: null,
      cancelledOrders: 0,
    };

    if (idStr) {
      customerIdMap.set(idStr, c);
      results.set(idStr, { ...defaultMetric });
    }
    if (cleanEmail) {
      emailMap.set(cleanEmail, c);
    }
  }

  const validEmails = Array.from(emailMap.keys());
  const validIds = Array.from(customerIdMap.keys())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const matchOr = [];
  if (validIds.length > 0) matchOr.push({ customerId: { $in: validIds } });
  if (validEmails.length > 0) matchOr.push({ "customerDetails.email": { $in: validEmails } });

  if (matchOr.length === 0) return results;

  const [validAgg, cancelAgg] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $nin: ["CANCELLED", "FAILED"] },
          $or: matchOr,
        },
      },
      {
        $group: {
          _id: {
            email: { $toLower: "$customerDetails.email" },
            customerId: "$customerId",
          },
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: "$pricing.grandTotal" },
          itemsPurchased: { $sum: { $size: { $ifNull: ["$items", []] } } },
          firstOrderDate: { $min: "$createdAt" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: "CANCELLED",
          $or: matchOr,
        },
      },
      {
        $group: {
          _id: {
            email: { $toLower: "$customerDetails.email" },
            customerId: "$customerId",
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  for (const row of validAgg) {
    const rowEmail = row._id?.email;
    const rowCustId = row._id?.customerId?.toString();
    const cust = (rowCustId ? customerIdMap.get(rowCustId) : null) || (rowEmail ? emailMap.get(rowEmail) : null);
    if (!cust) continue;

    const idStr = cust._id?.toString();
    const existing = results.get(idStr) || {
      totalOrders: 0,
      totalSpend: 0,
      avgOrderValue: 0,
      itemsPurchased: 0,
      firstOrderDate: null,
      lastOrderDate: null,
      cancelledOrders: 0,
    };

    existing.totalOrders += row.totalOrders || 0;
    existing.totalSpend += Math.round(row.totalSpend || 0);
    existing.itemsPurchased += row.itemsPurchased || 0;

    if (!existing.firstOrderDate || (row.firstOrderDate && row.firstOrderDate < existing.firstOrderDate)) {
      existing.firstOrderDate = row.firstOrderDate;
    }
    if (!existing.lastOrderDate || (row.lastOrderDate && row.lastOrderDate > existing.lastOrderDate)) {
      existing.lastOrderDate = row.lastOrderDate;
    }

    results.set(idStr, existing);
  }

  for (const row of cancelAgg) {
    const rowEmail = row._id?.email;
    const rowCustId = row._id?.customerId?.toString();
    const cust = (rowCustId ? customerIdMap.get(rowCustId) : null) || (rowEmail ? emailMap.get(rowEmail) : null);
    if (!cust) continue;

    const idStr = cust._id?.toString();
    const existing = results.get(idStr);
    if (existing) {
      existing.cancelledOrders += row.count || 0;
    }
  }

  for (const [, m] of results.entries()) {
    if (m.totalOrders > 0) {
      m.avgOrderValue = Math.round(m.totalSpend / m.totalOrders);
    }
  }

  return results;
}

/**
 * Telemetry summary for Customer list KPI cards
 */
export async function getCustomerListMetrics() {
  await connectToDatabase();
  await syncCustomersFromOrders();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    statusCountsAgg,
    newLast30Days,
    orderOverallStats,
    customerCohortStats,
  ] = await Promise.all([
    Customer.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Customer.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: thirtyDaysAgo } }),
    Order.aggregate([
      {
        $match: {
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpend: { $sum: "$pricing.grandTotal" },
          itemsPurchased: { $sum: { $size: { $ifNull: ["$items", []] } } },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$customerDetails.email", "$customer.email"] },
          orderCount: { $sum: 1 },
          totalSpend: { $sum: "$pricing.grandTotal" },
        },
      },
    ]),
  ]);

  let totalCustomers = 0;
  let activeCustomers = 0;
  let inactiveCustomers = 0;
  let blockedCustomers = 0;

  for (const s of statusCountsAgg) {
    totalCustomers += s.count || 0;
    if (s._id === "ACTIVE") activeCustomers = s.count || 0;
    else if (s._id === "INACTIVE") inactiveCustomers = s.count || 0;
    else if (s._id === "BLOCKED") blockedCustomers = s.count || 0;
  }

  const orderStats = orderOverallStats[0] || {};
  const totalOrders = orderStats.totalOrders || 0;
  const totalSpend = Math.round(orderStats.totalSpend || 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalSpend / totalOrders) : 0;
  const itemsPurchased = orderStats.itemsPurchased || 0;

  let repeatBuyers = 0;
  let highValueVips = 0;

  customerCohortStats.forEach((c) => {
    if ((c.orderCount || 0) >= 2) repeatBuyers++;
    if ((c.totalSpend || 0) >= 10000) highValueVips++;
  });

  return {
    totalCustomers: totalCustomers || 0,
    activeCustomers: activeCustomers || 0,
    inactiveCustomers: inactiveCustomers || 0,
    blockedCustomers: blockedCustomers || 0,
    newLast30Days: newLast30Days || 0,
    totalOrders,
    totalSpend,
    totalCustomerSpend: totalSpend,
    totalLtv: totalSpend,
    averageOrderValue,
    itemsPurchased,
    repeatBuyers,
    highValueVips,
  };
}
