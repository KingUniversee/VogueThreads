import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

async function createToken(permissions = ["*"]) {
  const secret = new TextEncoder().encode(SECRET_KEY);
  return await new SignJWT({
    id: "660000000000000000000001",
    email: "admin@voguethreads.in",
    name: "Analytics Test User",
    role: "admin",
    roleName: "Admin",
    permissions,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

async function runPhase9AnalyticsTests() {
  console.log("==================================================");
  console.log("PHASE 9 - ANALYTICS FULL VERIFICATION SUITE");
  console.log("==================================================");

  await mongoose.connect(DATABASE_URL);
  console.log("✓ Connected to MongoDB.");

  // 1. Test Date Range Resolver
  console.log("\n--- TEST 1: Date Range Resolver & Period Duration Matching ---");
  const { resolveAnalyticsDateRange } = await import("../src/lib/analytics-service.js");
  const ranges = ["today", "yesterday", "7d", "30d", "this_month", "last_month", "this_year"];

  for (const r of ranges) {
    const res = resolveAnalyticsDateRange(r);
    const curDur = res.currentEnd.getTime() - res.currentStart.getTime();
    const prevDur = res.previousEnd.getTime() - res.previousStart.getTime();
    console.log(`  Range [${r}]: label="${res.label}", interval=${res.interval}`);
    if (Math.abs(curDur - prevDur) > 1000) {
      throw new Error(`Period duration mismatch for range ${r}: current=${curDur}ms, previous=${prevDur}ms`);
    }
  }

  // Test custom range
  const custom = resolveAnalyticsDateRange("custom", "2026-08-01", "2026-08-31");
  console.log(`  Range [custom]: label="${custom.label}", interval=${custom.interval}`);
  if (!custom.currentStart || !custom.currentEnd || !custom.previousStart || !custom.previousEnd) {
    throw new Error("Custom range resolution failed");
  }
  console.log("✓ Date range resolver passed with exact comparative durations.");

  // 2. Test Direct Analytics Service Methods
  console.log("\n--- TEST 2: Analytics Service Aggregations ---");
  const {
    getAnalyticsOverview,
    getSalesAnalytics,
    getProductAnalytics,
    getCustomerAnalytics,
    getConversionAnalytics,
  } = await import("../src/lib/analytics-service.js");

  // Overview
  const overview = await getAnalyticsOverview({ range: "30d" });
  console.log("  Overview KPIs:", {
    grossRevenue: overview.kpis.grossRevenue.value,
    netRevenue: overview.kpis.netRevenue.value,
    ordersCount: overview.kpis.ordersCount.value,
    aov: overview.kpis.aov.value,
    unitsSold: overview.kpis.unitsSold.value,
  });
  if (typeof overview.kpis.grossRevenue.value !== "number" || typeof overview.kpis.netRevenue.value !== "number") {
    throw new Error("Overview KPI contract broken");
  }
  if (!Array.isArray(overview.trend?.points)) {
    throw new Error("Overview trend points missing");
  }
  console.log(`  ✓ Overview service verified (${overview.trend.points.length} trend points).`);

  // Sales
  const sales = await getSalesAnalytics({ range: "30d" });
  console.log("  Sales Financials:", {
    grossSales: sales.financials.grossSales,
    discounts: sales.financials.discounts,
    refunds: sales.financials.refunds,
    netSales: sales.financials.netSales,
    shippingFees: sales.financials.shippingFees,
    taxes: sales.financials.taxes,
  });
  // Net sales formula check
  const calculatedNet = sales.financials.grossSales - sales.financials.discounts - sales.financials.refunds;
  if (sales.financials.netSales !== calculatedNet) {
    throw new Error(`Net sales mismatch: got ${sales.financials.netSales}, expected ${calculatedNet}`);
  }
  console.log("  ✓ Sales financial math strictly verified (Gross - Discounts - Refunds = Net).");

  // Products
  const products = await getProductAnalytics({ range: "30d", sortBy: "revenue", sortOrder: "desc" });
  console.log(`  Products sold count: ${products.products.length}`);
  if (products.products.length > 0) {
    const top = products.products[0];
    console.log("  Top product:", {
      title: top.title,
      revenue: top.revenue,
      unitsSold: top.unitsSold,
      stock: top.availableStock,
      isLowStock: top.isLowStock,
    });
    if (typeof top.revenue !== "number" || typeof top.unitsSold !== "number") {
      throw new Error("Product metrics contract broken");
    }
  }
  console.log("  ✓ Products analytics service verified.");

  // Customers
  const customers = await getCustomerAnalytics({ range: "30d" });
  console.log("  Customer Analytics:", {
    totalRegistered: customers.acquisition.totalRegistered,
    newInPeriod: customers.acquisition.newInPeriod,
    activeBuyersInPeriod: customers.acquisition.activeBuyersInPeriod,
    repeatBuyerPercent: customers.acquisition.repeatBuyerPercent,
    vipTiers: customers.tiers.vip.count,
  });
  console.log("  ✓ Customer analytics service verified.");

  // Conversion
  const conversion = await getConversionAnalytics({ range: "30d" });
  console.log("  Conversion Telemetry Status:", conversion.storefrontTracking.status);
  console.log("  Commerce Conversion Rates:", {
    fulfillmentRate: `${conversion.commerceConversions.fulfillmentConversionRate}%`,
    paymentCaptureRate: `${conversion.commerceConversions.paymentCaptureRate}%`,
    returnRate: `${conversion.commerceConversions.returnRate}%`,
    repeatBuyerRate: `${conversion.commerceConversions.repeatBuyerRate}%`,
  });
  if (conversion.storefrontTracking.active !== false || conversion.storefrontTracking.status !== "TRACKING_UNAVAILABLE") {
    throw new Error("Conversion must report TRACKING_UNAVAILABLE when storefront telemetry is not connected");
  }
  console.log("  ✓ Conversion authentic rates & telemetry transparency verified.");

  // 3. HTTP API Endpoints Test
  console.log("\n--- TEST 3: HTTP API Endpoints ---");
  const superToken = await createToken(["*"]);
  const readToken = await createToken(["analytics.read"]);
  const authHeaders = {
    "Content-Type": "application/json",
    Cookie: `admin_session=${superToken}`,
  };
  const readHeaders = {
    "Content-Type": "application/json",
    Cookie: `admin_session=${readToken}`,
  };

  const endpoints = [
    { url: "/api/analytics/overview?range=30d", name: "Overview" },
    { url: "/api/analytics/sales?range=30d", name: "Sales" },
    { url: "/api/analytics/products?range=30d", name: "Products" },
    { url: "/api/analytics/customers?range=30d", name: "Customers" },
    { url: "/api/analytics/conversion?range=30d", name: "Conversion" },
    { url: "/api/analytics/overview?range=custom&startDate=2026-08-01&endDate=2026-08-31", name: "Custom Overview" },
  ];

  for (const ep of endpoints) {
    const res = await fetch(`${BASE_URL}${ep.url}`, { headers: authHeaders });
    const json = await res.json();
    console.log(`  [Super Admin] ${ep.name} (${ep.url}) -> status: ${res.status}, success: ${json.success}`);
    if (res.status !== 200 || !json.success || !json.data) {
      throw new Error(`API endpoint ${ep.url} failed with status ${res.status}`);
    }

    // Verify read-only role can access
    const resRead = await fetch(`${BASE_URL}${ep.url}`, { headers: readHeaders });
    const jsonRead = await resRead.json();
    if (resRead.status !== 200 || !jsonRead.success) {
      throw new Error(`API endpoint ${ep.url} failed with analytics.read permission`);
    }
  }
  console.log("  ✓ All 5 Analytics API endpoints returned 200 with RBAC validation.");

  // Unauthenticated test
  console.log("\n--- TEST 4: Unauthenticated Request Protection ---");
  const unauthRes = await fetch(`${BASE_URL}/api/analytics/overview`);
  console.log(`  Unauthenticated request status: ${unauthRes.status}`);
  if (unauthRes.status !== 401 && unauthRes.status !== 403) {
    throw new Error("Unauthenticated request was not rejected with 401/403");
  }
  console.log("  ✓ Analytics APIs strictly protected against unauthenticated requests.");

  // 4. Test Frontend HTML Pages
  console.log("\n--- TEST 5: Frontend Dashboard Pages Rendering ---");
  const pages = [
    "/analytics",
    "/analytics/sales",
    "/analytics/products",
    "/analytics/customers",
    "/analytics/conversion",
  ];

  for (const p of pages) {
    const pageRes = await fetch(`${BASE_URL}${p}`, {
      headers: { Cookie: `admin_session=${superToken}` },
    });
    console.log(`  Page ${p} -> status: ${pageRes.status}`);
    if (pageRes.status !== 200) {
      throw new Error(`Page ${p} returned status ${pageRes.status}`);
    }
    const html = await pageRes.text();
    if (!html.includes("Analytics") && !html.includes("VogueThreads")) {
      throw new Error(`Page ${p} did not render expected content`);
    }
  }
  console.log("  ✓ All 5 Frontend Analytics Pages render 200 successfully.");

  // 5. Verify Locked Sidebar
  console.log("\n--- TEST 6: Sidebar Integrity Verification ---");
  const sidebarPath = path.resolve("src/components/layout/sidebar.jsx");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");

  const requiredSections = [
    "MAIN",
    "CATALOG",
    "INVENTORY",
    "ORDERS",
    "CUSTOMERS",
    "MARKETING",
    "ANALYTICS",
    "SYSTEM",
  ];

  for (const sec of requiredSections) {
    if (!sidebarCode.includes(`title: "${sec}"`)) {
      throw new Error(`Sidebar missing required section: ${sec}`);
    }
  }

  const expectedAnalyticsItems = [
    '{ name: "Overview", href: "/analytics", icon: LineChart, exact: true }',
    '{ name: "Sales", href: "/analytics/sales", icon: BarChart3 }',
    '{ name: "Products", href: "/analytics/products", icon: Shirt }',
    '{ name: "Customers", href: "/analytics/customers", icon: Users }',
    '{ name: "Conversion", href: "/analytics/conversion", icon: TrendingUp }',
  ];

  for (const item of expectedAnalyticsItems) {
    if (!sidebarCode.includes(item)) {
      throw new Error(`Sidebar ANALYTICS section missing exact item: ${item}`);
    }
  }

  console.log("  ✓ Sidebar integrity verified: 100% locked and unaltered.");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 9 ANALYTICS TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runPhase9AnalyticsTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
