import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Order from "../models/Order.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Category from "../models/Category.js";
import Coupon from "../models/Coupon.js";
import Discount from "../models/Discount.js";

/**
 * Resolve date ranges into { currentStart, currentEnd, previousStart, previousEnd, interval, label }
 * Ensures exact duration-matched comparison periods.
 */
export function resolveAnalyticsDateRange(rangeKey = "30d", customStart = null, customEnd = null) {
  const now = new Date();
  let currentStart;
  let currentEnd = new Date(now);
  let previousStart;
  let previousEnd;
  let interval = "day"; // "hour", "day", "month"
  let label = "Last 30 Days";

  if (rangeKey === "custom" && customStart && customEnd) {
    currentStart = new Date(customStart);
    currentStart.setHours(0, 0, 0, 0);
    currentEnd = new Date(customEnd);
    currentEnd.setHours(23, 59, 59, 999);

    const duration = currentEnd.getTime() - currentStart.getTime();
    previousEnd = new Date(currentStart.getTime() - 1);
    previousStart = new Date(previousEnd.getTime() - duration);
    interval = duration > 60 * 24 * 60 * 60 * 1000 ? "month" : duration > 2 * 24 * 60 * 60 * 1000 ? "day" : "hour";
    label = `${currentStart.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${currentEnd.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`;
    return { currentStart, currentEnd, previousStart, previousEnd, interval, label };
  }

  switch (rangeKey) {
    case "today": {
      label = "Today";
      interval = "hour";
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diff);
      break;
    }
    case "yesterday": {
      label = "Yesterday";
      interval = "hour";
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - (diff + 1));
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
    case "7d": {
      label = "Last 7 Days";
      interval = "day";
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - diff);
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
    case "this_month": {
      label = "This Month";
      interval = "day";
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diff);
      break;
    }
    case "last_month": {
      label = "Last Month";
      interval = "day";
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - (diff + 1));
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
    case "this_year": {
      label = "This Year";
      interval = "month";
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diff);
      break;
    }
    case "30d":
    default: {
      label = "Last 30 Days";
      interval = "day";
      currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - diff);
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
  }

  return { currentStart, currentEnd, previousStart, previousEnd, interval, label };
}

export function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * 1. Executive Analytics Overview Data
 */
export async function getAnalyticsOverview(queryParams = {}) {
  await connectToDatabase();

  const { range = "30d", startDate, endDate } = queryParams;
  const { currentStart, currentEnd, previousStart, previousEnd, interval, label } =
    resolveAnalyticsDateRange(range, startDate, endDate);

  const dateFormat = interval === "hour" ? "%Y-%m-%d %H:00" : interval === "month" ? "%Y-%m" : "%Y-%m-%d";

  // Execute all period metrics and breakdown aggregations concurrently in a single parallel batch
  const [currentAgg, prevAgg, currentRefundsAgg, prevRefundsAgg, trendAgg, paymentAgg, categoryAgg] =
    await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart, $lte: currentEnd },
            status: { $nin: ["CANCELLED", "FAILED"] },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$pricing.grandTotal" },
            grossSales: { $sum: "$pricing.subtotal" },
            discounts: { $sum: "$pricing.discountAmount" },
            orderCount: { $sum: 1 },
            unitsSold: { $sum: { $sum: "$items.quantity" } },
            distinctCustomers: { $addToSet: "$customerDetails.email" },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStart, $lte: previousEnd },
            status: { $nin: ["CANCELLED", "FAILED"] },
          },
        },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$pricing.grandTotal" },
            grossSales: { $sum: "$pricing.subtotal" },
            discounts: { $sum: "$pricing.discountAmount" },
            orderCount: { $sum: 1 },
            unitsSold: { $sum: { $sum: "$items.quantity" } },
            distinctCustomers: { $addToSet: "$customerDetails.email" },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart, $lte: currentEnd },
            "refunds.0": { $exists: true },
          },
        },
        { $unwind: "$refunds" },
        { $group: { _id: null, totalRefunds: { $sum: "$refunds.amount" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStart, $lte: previousEnd },
            "refunds.0": { $exists: true },
          },
        },
        { $unwind: "$refunds" },
        { $group: { _id: null, totalRefunds: { $sum: "$refunds.amount" }, count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart, $lte: currentEnd },
            status: { $nin: ["CANCELLED", "FAILED"] },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
            revenue: { $sum: "$pricing.grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart, $lte: currentEnd },
            status: { $nin: ["CANCELLED", "FAILED"] },
          },
        },
        {
          $group: {
            _id: "$payment.method",
            revenue: { $sum: "$pricing.grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: currentStart, $lte: currentEnd },
            status: { $nin: ["CANCELLED", "FAILED"] },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.category",
            revenue: { $sum: "$items.subtotal" },
            units: { $sum: "$items.quantity" },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

  const cur = currentAgg[0] || { revenue: 0, grossSales: 0, discounts: 0, orderCount: 0, unitsSold: 0, distinctCustomers: [] };
  const prv = prevAgg[0] || { revenue: 0, grossSales: 0, discounts: 0, orderCount: 0, unitsSold: 0, distinctCustomers: [] };

  const curUnits = cur.unitsSold || 0;
  const prvUnits = prv.unitsSold || 0;

  const curRefunds = currentRefundsAgg[0]?.totalRefunds || 0;
  const prvRefunds = prevRefundsAgg[0]?.totalRefunds || 0;

  const curAov = cur.orderCount > 0 ? Number((cur.revenue / cur.orderCount).toFixed(2)) : 0;
  const prvAov = prv.orderCount > 0 ? Number((prv.revenue / prv.orderCount).toFixed(2)) : 0;

  const curCustCount = cur.distinctCustomers?.length || 0;
  const prvCustCount = prv.distinctCustomers?.length || 0;

  const curNetRevenue = cur.revenue - curRefunds;
  const prvNetRevenue = prv.revenue - prvRefunds;

  const revenueKpi = {
    value: cur.revenue,
    previousValue: prv.revenue,
    change: calculatePercentChange(cur.revenue, prv.revenue),
    changePercent: calculatePercentChange(cur.revenue, prv.revenue),
    isPositive: cur.revenue >= prv.revenue,
  };

  const netRevenueKpi = {
    value: curNetRevenue,
    previousValue: prvNetRevenue,
    change: calculatePercentChange(curNetRevenue, prvNetRevenue),
    changePercent: calculatePercentChange(curNetRevenue, prvNetRevenue),
    isPositive: curNetRevenue >= prvNetRevenue,
  };

  const ordersKpi = {
    value: cur.orderCount,
    previousValue: prv.orderCount,
    change: calculatePercentChange(cur.orderCount, prv.orderCount),
    changePercent: calculatePercentChange(cur.orderCount, prv.orderCount),
    isPositive: cur.orderCount >= prv.orderCount,
  };

  const customersKpi = {
    value: curCustCount,
    previousValue: prvCustCount,
    change: calculatePercentChange(curCustCount, prvCustCount),
    changePercent: calculatePercentChange(curCustCount, prvCustCount),
    isPositive: curCustCount >= prvCustCount,
  };

  const aovKpi = {
    value: curAov,
    previousValue: prvAov,
    change: calculatePercentChange(curAov, prvAov),
    changePercent: calculatePercentChange(curAov, prvAov),
    isPositive: curAov >= prvAov,
  };

  const unitsSoldKpi = {
    value: curUnits,
    previousValue: prvUnits,
    change: calculatePercentChange(curUnits, prvUnits),
    changePercent: calculatePercentChange(curUnits, prvUnits),
    isPositive: curUnits >= prvUnits,
  };

  const refundsKpi = {
    value: curRefunds,
    count: currentRefundsAgg[0]?.count || 0,
    previousValue: prvRefunds,
    change: calculatePercentChange(curRefunds, prvRefunds),
    changePercent: calculatePercentChange(curRefunds, prvRefunds),
    isPositive: curRefunds <= prvRefunds,
  };

  const discountsKpi = {
    value: cur.discounts,
    count: cur.orderCount,
    previousValue: prv.discounts,
    change: calculatePercentChange(cur.discounts, prv.discounts),
    changePercent: calculatePercentChange(cur.discounts, prv.discounts),
    isPositive: true,
  };

  // Build KPIs with percentage changes
  const kpis = {
    revenue: revenueKpi,
    grossRevenue: revenueKpi,
    netRevenue: netRevenueKpi,
    orders: ordersKpi,
    ordersCount: ordersKpi,
    customers: customersKpi,
    customersCount: customersKpi,
    aov: aovKpi,
    unitsSold: unitsSoldKpi,
    refunds: refundsKpi,
    discounts: discountsKpi,
    conversionRate: {
      value: null,
      trackingAvailable: false,
      reason: "Storefront visitor session telemetry is not active.",
    },
  };

  // 2. Timeline Trend Chart Points
  const trendPoints = trendAgg.map((pt) => ({
    date: pt._id,
    label: pt._id,
    revenue: pt.revenue,
    orders: pt.orders,
  }));

  // 3. Payment Methods Breakdown
  const paymentBreakdown = paymentAgg.map((p) => ({
    method: p._id || "OTHER",
    amount: p.revenue,
    revenue: p.revenue,
    count: p.orders,
    orders: p.orders,
    percentage: cur.revenue > 0 ? Number(((p.revenue / cur.revenue) * 100).toFixed(1)) : 0,
    share: cur.revenue > 0 ? Number(((p.revenue / cur.revenue) * 100).toFixed(1)) : 0,
  }));

  // 4. Category Breakdown
  const categories = categoryAgg.map((c) => ({
    category: c._id || "Apparel",
    revenue: c.revenue,
    units: c.units,
    count: c.count,
  }));

  return {
    period: {
      range,
      label,
      interval,
      currentStart: currentStart.toISOString(),
      currentEnd: currentEnd.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    },
    kpis,
    chart: {
      interval,
      points: trendPoints,
    },
    trend: {
      interval,
      points: trendPoints,
    },
    paymentBreakdown,
    paymentMethods: paymentBreakdown,
    categories,
    isDatabaseEmpty: cur.orderCount === 0 && prv.orderCount === 0,
  };
}

/**
 * 2. Detailed Sales Analytics
 */
export async function getSalesAnalytics(queryParams = {}) {
  await connectToDatabase();

  const { range = "30d", startDate, endDate } = queryParams;
  const { currentStart, currentEnd, previousStart, previousEnd, interval, label } =
    resolveAnalyticsDateRange(range, startDate, endDate);

  const dateFormat = interval === "hour" ? "%Y-%m-%d %H:00" : interval === "month" ? "%Y-%m" : "%Y-%m-%d";

  const [salesTotalsAgg, refundsAgg, statusAgg, paymentAgg, salesTimelineAgg] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: null,
          grossSales: { $sum: "$pricing.subtotal" },
          discounts: { $sum: "$pricing.discountAmount" },
          shippingFee: { $sum: "$pricing.shippingFee" },
          codFee: { $sum: "$pricing.codFee" },
          taxTotal: { $sum: "$pricing.taxBreakdown.totalTax" },
          grandTotal: { $sum: "$pricing.grandTotal" },
          orderCount: { $sum: 1 },
          unitsSold: { $sum: { $sum: "$items.quantity" } },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
          "refunds.0": { $exists: true },
        },
      },
      { $unwind: "$refunds" },
      { $group: { _id: null, totalRefunds: { $sum: "$refunds.amount" }, refundCount: { $sum: 1 } } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          amount: { $sum: "$pricing.grandTotal" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: "$payment.method",
          count: { $sum: 1 },
          amount: { $sum: "$pricing.grandTotal" },
        },
      },
      { $sort: { amount: -1 } },
    ]),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
          grossSales: { $sum: "$pricing.subtotal" },
          discounts: { $sum: "$pricing.discountAmount" },
          netSales: { $sum: "$pricing.grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totals = salesTotalsAgg[0] || {
    grossSales: 0,
    discounts: 0,
    shippingFee: 0,
    codFee: 0,
    taxTotal: 0,
    grandTotal: 0,
    orderCount: 0,
    unitsSold: 0,
  };

  const unitsSold = totals.unitsSold || 0;
  const refundsTotal = refundsAgg[0]?.totalRefunds || 0;
  const netSales = Math.max(0, totals.grossSales - totals.discounts - refundsTotal);
  const aov = totals.orderCount > 0 ? Number((totals.grandTotal / totals.orderCount).toFixed(2)) : 0;
  const avgNetOrderValue = totals.orderCount > 0 ? Number((netSales / totals.orderCount).toFixed(2)) : 0;

  const paymentChannels = paymentAgg.map((p) => {
    const share = totals.grandTotal > 0 ? Number(((p.amount / totals.grandTotal) * 100).toFixed(1)) : 0;
    return {
      channel: p._id || "OTHER",
      count: p.count,
      ordersCount: p.count,
      amount: p.amount,
      grossAmount: p.amount,
      netAmount: p.amount,
      share,
      sharePercent: share,
    };
  });

  const orderStatusBreakdown = statusAgg.map((s) => ({
    status: s._id,
    count: s.count,
    amount: s.amount,
  }));

  return {
    period: { range, label, currentStart, currentEnd },
    financials: {
      grossSales: totals.grossSales,
      discounts: totals.discounts,
      refunds: refundsTotal,
      shippingFees: totals.shippingFee + totals.codFee,
      taxes: totals.taxTotal,
      netSales,
      totalRevenue: totals.grandTotal,
      orders: totals.orderCount,
      ordersCount: totals.orderCount,
      unitsSold,
      aov,
      averageNetOrderValue: avgNetOrderValue,
    },
    timeline: salesTimelineAgg.map((s) => ({
      date: s._id,
      label: s._id,
      grossSales: s.grossSales,
      discounts: s.discounts,
      netSales: s.grossSales - s.discounts,
      orders: s.orders,
      ordersCount: s.orders,
    })),
    paymentChannels,
    statusBreakdown: orderStatusBreakdown,
    orderStatusBreakdown,
  };
}

/**
 * 3. Line-Item Product Sales Performance
 */
export async function getProductAnalytics(queryParams = {}) {
  await connectToDatabase();

  const { range = "30d", sortBy = "revenue", sortOrder = "desc", search = "" } = queryParams;
  const { currentStart, currentEnd, label } = resolveAnalyticsDateRange(range);

  // Group line items by productId
  const productAgg = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: currentStart, $lte: currentEnd },
        status: { $nin: ["CANCELLED", "FAILED"] },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        productTitle: { $first: "$items.title" },
        revenue: { $sum: "$items.total" },
        subtotal: { $sum: "$items.subtotal" },
        unitsSold: { $sum: "$items.quantity" },
        ordersCount: { $sum: 1 },
        skus: { $addToSet: "$items.sku" },
      },
    },
  ]);

  // Collect valid product IDs
  const validProductIds = productAgg.map((p) => p._id).filter(Boolean);

  // Batch fetch products and inventory items in 2 parallel queries instead of 2*N sequential queries
  const [productList, inventoryList] = await Promise.all([
    Product.find({ _id: { $in: validProductIds } })
      .select("title thumbnail images categoryId")
      .populate("categoryId", "name")
      .lean(),
    Inventory.find({ productId: { $in: validProductIds } })
      .select("productId available threshold lowStockThreshold")
      .lean(),
  ]);

  const productMap = new Map();
  for (const prod of productList) {
    productMap.set(prod._id.toString(), prod);
  }

  const inventoryMap = new Map();
  for (const inv of inventoryList) {
    const pid = inv.productId?.toString();
    if (!pid) continue;
    if (!inventoryMap.has(pid)) {
      inventoryMap.set(pid, []);
    }
    inventoryMap.get(pid).push(inv);
  }

  // Enrich synchronously in-memory
  const enrichedProducts = productAgg.map((p) => {
    let productDoc = null;
    let categoryName = "Apparel";
    let availableStock = 0;
    let isLowStock = false;

    if (p._id) {
      const pidStr = p._id.toString();
      productDoc = productMap.get(pidStr) || null;
      if (productDoc?.categoryId?.name) {
        categoryName = productDoc.categoryId.name;
      }

      const invDocs = inventoryMap.get(pidStr) || [];
      availableStock = invDocs.reduce((acc, inv) => acc + (inv.available || 0), 0);
      isLowStock = invDocs.some(
        (inv) => (inv.available || 0) <= (inv.lowStockThreshold || inv.threshold || 5)
      );
    }

    const avgSellingPrice = p.unitsSold > 0 ? Number((p.revenue / p.unitsSold).toFixed(2)) : 0;

    return {
      productId: p._id,
      title: productDoc?.title || p.productTitle || "Unknown Product",
      thumbnail: productDoc?.thumbnail || productDoc?.images?.[0]?.url || productDoc?.images?.[0] || null,
      category: categoryName,
      revenue: p.revenue,
      unitsSold: p.unitsSold,
      ordersCount: p.ordersCount,
      avgSellingPrice,
      availableStock,
      isLowStock,
      skus: p.skus || [],
    };
  });

  // Filter & Sort
  let filtered = enrichedProducts;
  if (search && search.trim()) {
    const s = search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) => p.title.toLowerCase().includes(s) || p.skus.some((sku) => sku.toLowerCase().includes(s))
    );
  }

  filtered.sort((a, b) => {
    let diff = 0;
    if (sortBy === "unitsSold") diff = a.unitsSold - b.unitsSold;
    else if (sortBy === "ordersCount") diff = a.ordersCount - b.ordersCount;
    else if (sortBy === "availableStock") diff = a.availableStock - b.availableStock;
    else diff = a.revenue - b.revenue;
    return sortOrder === "asc" ? diff : -diff;
  });

  const totalProductRevenue = filtered.reduce((acc, p) => acc + p.revenue, 0);
  const totalUnitsSold = filtered.reduce((acc, p) => acc + p.unitsSold, 0);

  return {
    period: { range, label, currentStart, currentEnd },
    summary: {
      totalProductsSold: filtered.length,
      totalRevenue: totalProductRevenue,
      totalUnits: totalUnitsSold,
      averageSellingPrice:
        totalUnitsSold > 0 ? Number((totalProductRevenue / totalUnitsSold).toFixed(2)) : 0,
    },
    products: filtered,
  };
}

/**
 * 4. Customer Acquisition, Retention & Cohorts
 */
export async function getCustomerAnalytics(queryParams = {}) {
  await connectToDatabase();

  const { range = "30d", startDate, endDate } = queryParams;
  const { currentStart, currentEnd, label } = resolveAnalyticsDateRange(range, startDate, endDate);

  // 1-3. Run registry counts and order aggregations in parallel
  const [totalRegisteredCustomers, newCustomersCount, customerOrdersAgg] = await Promise.all([
    Customer.countDocuments({ isDeleted: { $ne: true } }),
    Customer.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: currentStart, $lte: currentEnd },
    }),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      {
        $group: {
          _id: "$customerDetails.email",
          name: { $first: "$customerDetails.name" },
          ordersCount: { $sum: 1 },
          totalSpend: { $sum: "$pricing.grandTotal" },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
      { $sort: { totalSpend: -1 } },
    ]),
  ]);

  // Extract distinct active buyer emails directly from the aggregation
  const activeOrderCustomers = customerOrdersAgg.map((c) => c._id).filter(Boolean);

  // 4. Returning buyers (customers with orders before period who also ordered in period)
  let returningCustomersCount = 0;
  if (activeOrderCustomers.length > 0) {
    const pastCustomers = await Order.distinct("customerDetails.email", {
      createdAt: { $lt: currentStart },
      "customerDetails.email": { $in: activeOrderCustomers },
    });
    returningCustomersCount = pastCustomers.length;
  }

  const activeCustomerCount = activeOrderCustomers.length;
  const totalPeriodRevenue = customerOrdersAgg.reduce((acc, c) => acc + c.totalSpend, 0);
  const totalPeriodOrders = customerOrdersAgg.reduce((acc, c) => acc + c.ordersCount, 0);

  // Spend tiers
  let vipCount = 0; // > 10,000
  let midCount = 0; // 2,500 to 10,000
  let starterCount = 0; // < 2,500

  customerOrdersAgg.forEach((c) => {
    if (c.totalSpend >= 10000) vipCount++;
    else if (c.totalSpend >= 2500) midCount++;
    else starterCount++;
  });

  const newBuyersCount = activeCustomerCount - returningCustomersCount;
  const repeatBuyerPercent =
    activeCustomerCount > 0 ? Number(((returningCustomersCount / activeCustomerCount) * 100).toFixed(1)) : 0;

  const acquisition = {
    totalRegistered: totalRegisteredCustomers,
    totalCustomers: totalRegisteredCustomers,
    newInPeriod: newCustomersCount,
    newCustomersInPeriod: newCustomersCount,
    activeBuyersInPeriod: activeCustomerCount,
    activeCustomersInPeriod: activeCustomerCount,
    returningCustomersInPeriod: returningCustomersCount,
    repeatBuyersInPeriod: returningCustomersCount,
    newBuyersInPeriod: Math.max(0, newBuyersCount),
    repeatBuyerPercent,
  };

  const tiers = {
    vip: { count: vipCount, label: "VIP Shoppers (₹10k+)" },
    mid: { count: midCount, label: "Core Fashion Buyers (₹2.5k–₹10k)" },
    starter: { count: starterCount, label: "Starter Orders (< ₹2.5k)" },
  };

  return {
    period: { range, label, currentStart, currentEnd },
    acquisition,
    metrics: {
      totalCustomers: totalRegisteredCustomers,
      newCustomersInPeriod: newCustomersCount,
      activeCustomersInPeriod: activeCustomerCount,
      returningCustomersInPeriod: returningCustomersCount,
      ordersPerCustomer:
        activeCustomerCount > 0 ? Number((totalPeriodOrders / activeCustomerCount).toFixed(1)) : 0,
      customerRevenue: totalPeriodRevenue,
      averageCustomerSpend:
        activeCustomerCount > 0 ? Number((totalPeriodRevenue / activeCustomerCount).toFixed(2)) : 0,
    },
    tiers,
    spendTiers: tiers,
    topSpenders: customerOrdersAgg.slice(0, 15).map((c) => ({
      email: c._id,
      name: c.name || "Customer",
      ordersCount: c.ordersCount,
      totalSpend: c.totalSpend,
      lastOrderDate: c.lastOrderDate,
    })),
  };
}

/**
 * 5. Authentic Commerce Conversion Analytics
 */
export async function getConversionAnalytics(queryParams = {}) {
  await connectToDatabase();

  const { range = "30d", startDate, endDate } = queryParams;
  const { currentStart, currentEnd, label } = resolveAnalyticsDateRange(range, startDate, endDate);

  // Real Database Metrics
  const [totalOrdersPlaced, completedOrders, paidTransactions, returnedOrders, totalCustomersCount, repeatCustomersCount] =
    await Promise.all([
      Order.countDocuments({
        createdAt: { $gte: currentStart, $lte: currentEnd },
      }),
      Order.countDocuments({
        createdAt: { $gte: currentStart, $lte: currentEnd },
        status: { $in: ["CONFIRMED", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED"] },
      }),
      Order.countDocuments({
        createdAt: { $gte: currentStart, $lte: currentEnd },
        "payment.status": "PAID",
      }),
      Order.countDocuments({
        createdAt: { $gte: currentStart, $lte: currentEnd },
        status: "RETURNED",
      }),
      Customer.countDocuments(),
      Customer.countDocuments({
        ordersCount: { $gt: 1 },
      }),
    ]);

  const fulfillmentConversionRate =
    totalOrdersPlaced > 0 ? Number(((completedOrders / totalOrdersPlaced) * 100).toFixed(1)) : 0;

  const paymentCaptureRate =
    totalOrdersPlaced > 0 ? Number(((paidTransactions / totalOrdersPlaced) * 100).toFixed(1)) : 0;

  const returnRate =
    completedOrders > 0 ? Number(((returnedOrders / completedOrders) * 100).toFixed(1)) : 0;

  const repeatBuyerRate =
    totalCustomersCount > 0 ? Number(((repeatCustomersCount / totalCustomersCount) * 100).toFixed(1)) : 0;

  return {
    period: { range, label, currentStart, currentEnd },
    storefrontTracking: {
      active: false,
      status: "TRACKING_UNAVAILABLE",
      message:
        "Storefront session tracking is not connected. Visitor-to-cart funnel telemetry cannot be authentically computed without storefront session events.",
      missingTelemetry: [
        "Storefront Visitor Sessions",
        "Product Page Views",
        "Add to Cart Events",
        "Checkout Initiation Events",
      ],
    },
    commerceConversions: {
      totalOrdersPlaced,
      completedOrders,
      fulfillmentConversionRate,
      paymentCaptureRate,
      returnRate,
      repeatBuyerRate,
      totalCustomers: totalCustomersCount,
      repeatCustomers: repeatCustomersCount,
    },
  };
}
