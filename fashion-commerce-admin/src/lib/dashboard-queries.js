import { connectToDatabase } from "./mongoose.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Category from "../models/Category.js";

/**
 * Resolve date ranges into { currentStart, currentEnd, previousStart, previousEnd, interval, label }
 */
export function resolveDateRange(rangeKey = "30d") {
  const now = new Date();
  let currentStart;
  let currentEnd = new Date(now);
  let previousStart;
  let previousEnd;
  let interval = "day"; // "hour" or "day"
  let label = "Last 30 days";

  switch (rangeKey) {
    case "today": {
      label = "Today";
      interval = "hour";
      currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const dayDiff = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - dayDiff);
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
      label = "Last 7 days";
      interval = "day";
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - diff);
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
    case "this_month": {
      label = "This month";
      interval = "day";
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diff);
      break;
    }
    case "last_month": {
      label = "Last month";
      interval = "day";
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - (diff + 1));
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
    case "90d": {
      label = "Last 90 days";
      interval = "day";
      currentStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const diff = currentEnd.getTime() - currentStart.getTime();
      previousStart = new Date(currentStart.getTime() - diff);
      previousEnd = new Date(currentStart.getTime() - 1);
      break;
    }
    case "30d":
    default: {
      label = "Last 30 days";
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

function calculatePercentChange(current, previous) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/**
 * Query real MongoDB data for the executive dashboard
 */
export async function getDashboardData(rangeKey = "30d") {
  await connectToDatabase();

  const { currentStart, currentEnd, previousStart, previousEnd, interval, label } =
    resolveDateRange(rangeKey);

  // Construct timeline pipeline according to interval
  const timelinePipeline =
    interval === "hour"
      ? [
          {
            $match: {
              createdAt: { $gte: currentStart, $lte: currentEnd },
              status: { $nin: ["CANCELLED", "FAILED"] },
            },
          },
          {
            $group: {
              _id: { $hour: "$createdAt" },
              revenue: { $sum: "$pricing.grandTotal" },
              orders: { $sum: 1 },
            },
          },
        ]
      : [
          {
            $match: {
              createdAt: { $gte: currentStart, $lte: currentEnd },
              status: { $nin: ["CANCELLED", "FAILED"] },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              revenue: { $sum: "$pricing.grandTotal" },
              orders: { $sum: 1 },
            },
          },
        ];

  // Execute all independent queries concurrently in a single parallel batch
  const [
    currentAgg,
    prevAgg,
    distinctCurrent,
    distinctPrev,
    distinctTotal,
    repeatCustAgg,
    returnedOrdersCount,
    statusAgg,
    timelineAgg,
    topProducts,
    inventoryAlerts,
    recentOrders,
    catAgg,
    awaitingFulfillmentCount,
    lowStockCount,
  ] = await Promise.all([
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
          orderCount: { $sum: 1 },
        },
      },
    ]).catch((err) => {
      console.warn("⚠️ [Dashboard] Error aggregating current orders:", err.message);
      return [];
    }),
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
          orderCount: { $sum: 1 },
        },
      },
    ]).catch((err) => {
      console.warn("⚠️ [Dashboard] Error aggregating previous orders:", err.message);
      return [];
    }),
    Order.distinct("customerDetails.email", {
      createdAt: { $gte: currentStart, $lte: currentEnd },
    }).catch(() => []),
    Order.distinct("customerDetails.email", {
      createdAt: { $gte: previousStart, $lte: previousEnd },
    }).catch(() => []),
    Order.distinct("customerDetails.email").catch(() => []),
    Order.aggregate([
      { $group: { _id: "$customerDetails.email", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).catch(() => []),
    Order.countDocuments({
      createdAt: { $gte: currentStart, $lte: currentEnd },
      status: { $in: ["RETURNED", "REFUNDED"] },
    }).catch(() => 0),
    Order.aggregate([
      { $match: { createdAt: { $gte: currentStart, $lte: currentEnd } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).catch(() => []),
    Order.aggregate(timelinePipeline).catch(() => []),
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
          _id: "$items.productId",
          title: { $first: "$items.title" },
          image: { $first: "$items.image" },
          color: { $first: "$items.color" },
          size: { $first: "$items.size" },
          unitsSold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.total" },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]).catch(() => []),
    Inventory.find({
      $expr: { $lte: ["$available", "$lowStockThreshold"] },
    })
      .sort({ available: 1 })
      .limit(6)
      .populate("productId", "title categoryId primaryImages")
      .lean()
      .catch(() => []),
    Order.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select("orderNumber customerDetails shippingAddress items pricing payment status createdAt")
      .lean()
      .catch(() => []),
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: currentStart, $lte: currentEnd },
          status: { $nin: ["CANCELLED", "FAILED"] },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category.name",
          revenue: { $sum: "$items.total" },
          units: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 4 },
    ]).catch(() => []),
    Order.countDocuments({
      status: { $in: ["PAID", "PROCESSING", "PACKED"] },
    }).catch(() => 0),
    Inventory.countDocuments({
      $expr: { $lte: ["$available", "$lowStockThreshold"] },
    }).catch(() => 0),
  ]);

  // 1. Current & Previous Metrics
  const currentMetrics = {
    revenue: currentAgg[0]?.revenue || 0,
    orderCount: currentAgg[0]?.orderCount || 0,
  };
  const previousMetrics = {
    revenue: prevAgg[0]?.revenue || 0,
    orderCount: prevAgg[0]?.orderCount || 0,
  };

  // 2. Customers
  const currentCustomers = distinctCurrent.length;
  const previousCustomers = distinctPrev.length;
  const totalCustomers = distinctTotal.length;
  const returningCustomersCount = repeatCustAgg.length;

  // 3. Average Order Value (AOV)
  const currentAOV =
    currentMetrics.orderCount > 0
      ? Number((currentMetrics.revenue / currentMetrics.orderCount).toFixed(2))
      : 0;
  const previousAOV =
    previousMetrics.orderCount > 0
      ? Number((previousMetrics.revenue / previousMetrics.orderCount).toFixed(2))
      : 0;

  // 4. Returns and Return Rate
  const returnRate =
    currentMetrics.orderCount > 0
      ? Number(((returnedOrdersCount / currentMetrics.orderCount) * 100).toFixed(1))
      : 0;

  // 5. Order Status Distribution (All 10 standard statuses)
  const STATUS_LIST = [
    "PENDING_PAYMENT",
    "PAID",
    "PROCESSING",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "FAILED",
    "RETURNED",
    "REFUNDED",
  ];
  const orderStatusMap = {};
  STATUS_LIST.forEach((s) => {
    orderStatusMap[s] = 0;
  });
  statusAgg.forEach((item) => {
    if (item._id && orderStatusMap[item._id] !== undefined) {
      orderStatusMap[item._id] = item.count;
    }
  });

  // 6. Revenue Timeline (Chart Data)
  const timelinePoints = [];
  if (interval === "hour") {
    const hourMap = {};
    timelineAgg.forEach((h) => {
      hourMap[h._id] = h;
    });

    for (let hr = 0; hr < 24; hr += 2) {
      const item = hourMap[hr] || { revenue: 0, orders: 0 };
      const labelStr = `${hr.toString().padStart(2, "0")}:00`;
      timelinePoints.push({
        label: labelStr,
        revenue: item.revenue || 0,
        orders: item.orders || 0,
      });
    }
  } else {
    const dateMap = {};
    timelineAgg.forEach((d) => {
      dateMap[d._id] = d;
    });

    const cur = new Date(currentStart);
    while (cur <= currentEnd) {
      const key = cur.toISOString().split("T")[0];
      const monthShort = cur.toLocaleString("en-US", { month: "short" });
      const dayNum = cur.getDate();
      const displayLabel = `${monthShort} ${dayNum}`;
      const item = dateMap[key] || { revenue: 0, orders: 0 };

      timelinePoints.push({
        date: key,
        label: displayLabel,
        revenue: item.revenue || 0,
        orders: item.orders || 0,
      });

      cur.setDate(cur.getDate() + 1);
    }
  }

  // 7. Inventory Alerts Formatting
  const formattedInventoryAlerts = inventoryAlerts.map((inv) => {
    const product = inv.productId || {};
    return {
      sku: inv.variantSku,
      title: product.title || "Apparel Variant",
      variant: inv.variantId,
      available: inv.available ?? 0,
      reserved: inv.reserved ?? 0,
      threshold: inv.lowStockThreshold ?? 5,
      status: (inv.available ?? 0) <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
    };
  });

  // 8. Recent Incoming Orders Formatting
  const formattedRecentOrders = recentOrders.map((ord) => {
    const firstItem = ord.items?.[0] || {};
    const moreCount = (ord.items?.length || 1) - 1;
    const summary = firstItem.title
      ? `${firstItem.title} (${firstItem.color || ""} / ${firstItem.size || ""})${
          moreCount > 0 ? ` +${moreCount} more` : ""
        }`
      : "Apparel Order";

    return {
      id: ord.orderNumber,
      customer: ord.customerDetails?.name || "Guest Customer",
      email: ord.customerDetails?.email || "",
      city: ord.shippingAddress?.city
        ? `${ord.shippingAddress.city}, ${ord.shippingAddress.state || ""}`
        : "India",
      itemSummary: summary,
      amount: ord.pricing?.grandTotal || 0,
      paymentMethod: ord.payment?.method || "UPI",
      paymentStatus: ord.payment?.status || "PENDING",
      status: ord.status || "PROCESSING",
      date: ord.createdAt,
    };
  });

  // 9. Category Sales Breakdown Formatting
  const totalCatRevenue = catAgg.reduce((acc, c) => acc + c.revenue, 0);
  const categorySales = catAgg.map((c) => ({
    name: c._id || "General Apparel",
    revenue: c.revenue,
    units: c.units,
    share: totalCatRevenue > 0 ? Number(((c.revenue / totalCatRevenue) * 100).toFixed(0)) : 0,
  }));

  return {
    period: {
      key: rangeKey,
      label,
      start: currentStart,
      end: currentEnd,
    },
    kpis: {
      revenue: {
        value: currentMetrics.revenue,
        previousValue: previousMetrics.revenue,
        change: calculatePercentChange(currentMetrics.revenue, previousMetrics.revenue),
        isPositive: currentMetrics.revenue >= previousMetrics.revenue,
      },
      orders: {
        value: currentMetrics.orderCount,
        previousValue: previousMetrics.orderCount,
        change: calculatePercentChange(currentMetrics.orderCount, previousMetrics.orderCount),
        isPositive: currentMetrics.orderCount >= previousMetrics.orderCount,
      },
      customers: {
        value: currentCustomers,
        total: totalCustomers,
        previousValue: previousCustomers,
        change: calculatePercentChange(currentCustomers, previousCustomers),
        isPositive: currentCustomers >= previousCustomers,
      },
      aov: {
        value: currentAOV,
        previousValue: previousAOV,
        change: calculatePercentChange(currentAOV, previousAOV),
        isPositive: currentAOV >= previousAOV,
      },
      conversionRate: {
        value: 0, // 0% real empty rate until storefront analytics integration
        change: 0,
        isPositive: true,
      },
      returnRate: {
        value: returnRate,
        change: 0,
        isPositive: returnRate <= 5,
      },
    },
    chart: {
      points: timelinePoints,
      interval,
      totalRevenue: currentMetrics.revenue,
    },
    orderStatus: orderStatusMap,
    topProducts: topProducts.map((p, idx) => ({
      rank: idx + 1,
      id: p._id?.toString() || String(idx),
      title: p.title || "Apparel Item",
      image: p.image || null,
      unitsSold: p.unitsSold,
      revenue: p.revenue,
    })),
    inventoryAlerts: formattedInventoryAlerts,
    recentOrders: formattedRecentOrders,
    categorySales,
    quickInsights: {
      awaitingFulfillment: awaitingFulfillmentCount,
      lowStockCount: lowStockCount,
      returnRatePercent: returnRate,
      repeatCustomerRate:
        totalCustomers > 0
          ? Number(((returningCustomersCount / totalCustomers) * 100).toFixed(0))
          : 0,
    },
    isDatabaseEmpty:
      currentMetrics.orderCount === 0 &&
      totalCustomers === 0 &&
      formattedRecentOrders.length === 0,
  };
}
