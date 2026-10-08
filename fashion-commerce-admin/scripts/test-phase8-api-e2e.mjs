import mongoose from "mongoose";
import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";
const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

async function createSuperAdminToken() {
  const secret = new TextEncoder().encode(SECRET_KEY);
  return await new SignJWT({
    id: "660000000000000000000001",
    email: "admin@voguethreads.in",
    name: "Super Admin",
    role: "super-admin",
    roleName: "Super Admin",
    permissions: ["*"],
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

async function runPhase8ApiE2E() {
  console.log("==================================================");
  console.log("PHASE 8 - FULL END-TO-END HTTP API VERIFICATION");
  console.log("==================================================");

  const token = await createSuperAdminToken();
  const headers = {
    "Content-Type": "application/json",
    Cookie: `admin_session=${token}`,
  };

  await mongoose.connect(DATABASE_URL);

  // Clean up any previous test records
  const Coupon = (await import("../src/models/Coupon.js")).default;
  const Discount = (await import("../src/models/Discount.js")).default;
  const AuditLog = (await import("../src/models/AuditLog.js")).default;

  await Coupon.deleteMany({ code: /^E2E-/i });
  await Discount.deleteMany({ name: /^E2E /i });

  console.log("\n--- TEST 1: GET /api/coupons ---");
  const listCouponsRes = await fetch(`${BASE_URL}/api/coupons?page=1&limit=10`, { headers });
  const listCouponsData = await listCouponsRes.json();
  console.log(`Status: ${listCouponsRes.status}, Success: ${listCouponsData.success}, Total: ${listCouponsData.total}`);
  console.log("Coupons Metrics:", listCouponsData.metrics);
  if (!listCouponsData.success || !Array.isArray(listCouponsData.coupons)) {
    throw new Error("GET /api/coupons failed");
  }
  if (
    typeof listCouponsData.metrics?.totalCoupons !== "number" ||
    typeof listCouponsData.metrics?.activeCoupons !== "number" ||
    typeof listCouponsData.metrics?.totalRedemptions !== "number" ||
    typeof listCouponsData.metrics?.totalDiscountGiven !== "number" ||
    typeof listCouponsData.metrics?.expiringSoon !== "number"
  ) {
    throw new Error("GET /api/coupons metrics contract violated (must be strictly numeric)");
  }
  console.log("✓ Coupons directory & metrics API verified.");

  console.log("\n--- TEST 2: POST /api/coupons (Create Coupon) ---");
  const testCouponCode = `E2E-SUMMER30`;
  const createCouponRes = await fetch(`${BASE_URL}/api/coupons`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: testCouponCode,
      description: "E2E Summer Sale 30% Off",
      discountType: "PERCENTAGE",
      discountValue: 30,
      minimumOrderValue: 1500,
      maximumDiscountAmount: 900,
      usageLimit: 50,
      perCustomerUsageLimit: 2,
      startAt: new Date().toISOString(),
      status: "ACTIVE",
    }),
  });
  const createCouponData = await createCouponRes.json();
  console.log(`Status: ${createCouponRes.status}, Created ID: ${createCouponData.coupon?._id}`);
  if (!createCouponData.success || !createCouponData.coupon?._id) {
    throw new Error(`POST /api/coupons failed: ${createCouponData.error}`);
  }
  const createdCouponId = createCouponData.coupon._id;
  console.log("✓ Coupon promo code creation verified.");

  console.log("\n--- TEST 3: GET /api/coupons/[id] ---");
  const getCouponRes = await fetch(`${BASE_URL}/api/coupons/${createdCouponId}`, { headers });
  const getCouponData = await getCouponRes.json();
  console.log(`Status: ${getCouponRes.status}, Code: ${getCouponData.coupon?.code}`);
  if (!getCouponData.success || getCouponData.coupon?.code !== testCouponCode) {
    throw new Error("GET /api/coupons/[id] failed");
  }
  console.log("✓ Single coupon detail API verified.");

  console.log("\n--- TEST 4: PATCH /api/coupons/[id] ---");
  const updateCouponRes = await fetch(`${BASE_URL}/api/coupons/${createdCouponId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      description: "Updated E2E Summer Sale 35% Off",
      discountValue: 35,
    }),
  });
  const updateCouponData = await updateCouponRes.json();
  console.log(`Status: ${updateCouponRes.status}, New Discount: ${updateCouponData.coupon?.discountValue}%`);
  if (!updateCouponData.success || updateCouponData.coupon?.discountValue !== 35) {
    throw new Error("PATCH /api/coupons/[id] failed");
  }
  console.log("✓ Coupon update API verified.");

  console.log("\n--- TEST 5: PATCH /api/coupons/[id]/status ---");
  const toggleStatusRes = await fetch(`${BASE_URL}/api/coupons/${createdCouponId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  const toggleStatusData = await toggleStatusRes.json();
  console.log(`Status: ${toggleStatusRes.status}, Coupon Status: ${toggleStatusData.coupon?.status}`);
  if (!toggleStatusData.success || toggleStatusData.coupon?.status !== "INACTIVE") {
    throw new Error("PATCH /api/coupons/[id]/status failed");
  }

  // Restore to ACTIVE for validation test
  await fetch(`${BASE_URL}/api/coupons/${createdCouponId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "ACTIVE" }),
  });
  console.log("✓ Coupon status transition API verified.");

  console.log("\n--- TEST 6: POST /api/coupons/validate ---");
  // Subtotal = 2000. 35% = 700. Min order = 1500 (satisfied). Expected discount = 700.
  const validateRes = await fetch(`${BASE_URL}/api/coupons/validate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: testCouponCode,
      orderSubtotal: 2000,
      cartItems: [{ unitPrice: 2000, quantity: 1, subtotal: 2000 }],
    }),
  });
  const validateData = await validateRes.json();
  console.log(`Status: ${validateRes.status}, Valid: ${validateData.valid}, Discount: ₹${validateData.discountAmount}`);
  if (!validateData.valid || validateData.discountAmount !== 700) {
    throw new Error(`Coupon validation failed! Expected 700, got ${validateData.discountAmount}`);
  }
  console.log("✓ Authoritative server coupon validation API verified.");

  console.log("\n--- TEST 7: GET /api/discounts ---");
  const listDiscountsRes = await fetch(`${BASE_URL}/api/discounts?page=1&limit=10`, { headers });
  const listDiscountsData = await listDiscountsRes.json();
  console.log(`Status: ${listDiscountsRes.status}, Success: ${listDiscountsData.success}, Total: ${listDiscountsData.total}`);
  console.log("Discounts Metrics:", listDiscountsData.metrics);
  if (!listDiscountsData.success || !Array.isArray(listDiscountsData.discounts)) {
    throw new Error("GET /api/discounts failed");
  }
  if (
    typeof listDiscountsData.metrics?.totalDiscounts !== "number" ||
    typeof listDiscountsData.metrics?.activeDiscounts !== "number" ||
    typeof listDiscountsData.metrics?.scheduledDiscounts !== "number" ||
    typeof listDiscountsData.metrics?.expiredDiscounts !== "number"
  ) {
    throw new Error("GET /api/discounts metrics contract violated (must be strictly numeric)");
  }
  console.log("✓ Automatic discounts directory & metrics API verified.");

  console.log("\n--- TEST 8: POST /api/discounts (Create Discount) ---");
  const testDiscountName = `E2E Festive Flash 15%`;
  const createDiscountRes = await fetch(`${BASE_URL}/api/discounts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: testDiscountName,
      description: "Automated 15% discount for orders above ₹2000",
      discountType: "PERCENTAGE",
      discountValue: 15,
      minimumOrderValue: 2000,
      maximumDiscountAmount: 1000,
      priority: 5,
      stacking: "EXCLUSIVE",
      startAt: new Date().toISOString(),
      status: "ACTIVE",
    }),
  });
  const createDiscountData = await createDiscountRes.json();
  console.log(`Status: ${createDiscountRes.status}, Created ID: ${createDiscountData.discount?._id}`);
  if (!createDiscountData.success || !createDiscountData.discount?._id) {
    throw new Error(`POST /api/discounts failed: ${createDiscountData.error}`);
  }
  const createdDiscountId = createDiscountData.discount._id;
  console.log("✓ Automatic discount creation verified.");

  console.log("\n--- TEST 9: GET /api/discounts/[id] ---");
  const getDiscountRes = await fetch(`${BASE_URL}/api/discounts/${createdDiscountId}`, { headers });
  const getDiscountData = await getDiscountRes.json();
  console.log(`Status: ${getDiscountRes.status}, Name: ${getDiscountData.discount?.name}`);
  if (!getDiscountData.success || getDiscountData.discount?.name !== testDiscountName) {
    throw new Error("GET /api/discounts/[id] failed");
  }
  console.log("✓ Single discount detail API verified.");

  console.log("\n--- TEST 10: PATCH /api/discounts/[id] ---");
  const updateDiscountRes = await fetch(`${BASE_URL}/api/discounts/${createdDiscountId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      priority: 2,
      description: "Updated high-priority flash discount",
    }),
  });
  const updateDiscountData = await updateDiscountRes.json();
  console.log(`Status: ${updateDiscountRes.status}, New Priority: ${updateDiscountData.discount?.priority}`);
  if (!updateDiscountData.success || updateDiscountData.discount?.priority !== 2) {
    throw new Error("PATCH /api/discounts/[id] failed");
  }
  console.log("✓ Discount update API verified.");

  console.log("\n--- TEST 11: PATCH /api/discounts/[id]/status ---");
  const toggleDiscStatusRes = await fetch(`${BASE_URL}/api/discounts/${createdDiscountId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "INACTIVE" }),
  });
  const toggleDiscStatusData = await toggleDiscStatusRes.json();
  console.log(`Status: ${toggleDiscStatusRes.status}, Discount Status: ${toggleDiscStatusData.discount?.status}`);
  if (!toggleDiscStatusData.success || toggleDiscStatusData.discount?.status !== "INACTIVE") {
    throw new Error("PATCH /api/discounts/[id]/status failed");
  }
  console.log("✓ Discount status transition API verified.");

  console.log("\n--- TEST 12: DELETE /api/discounts/[id] ---");
  const deleteDiscRes = await fetch(`${BASE_URL}/api/discounts/${createdDiscountId}`, {
    method: "DELETE",
    headers,
  });
  const deleteDiscData = await deleteDiscRes.json();
  console.log(`Status: ${deleteDiscRes.status}, Success: ${deleteDiscData.success}`);
  if (!deleteDiscData.success) {
    throw new Error("DELETE /api/discounts/[id] failed");
  }
  console.log("✓ Unused discount permanent deletion verified.");

  console.log("\n--- TEST 13: DELETE /api/coupons/[id] ---");
  const deleteCpnRes = await fetch(`${BASE_URL}/api/coupons/${createdCouponId}`, {
    method: "DELETE",
    headers,
  });
  const deleteCpnData = await deleteCpnRes.json();
  console.log(`Status: ${deleteCpnRes.status}, Success: ${deleteCpnData.success}`);
  if (!deleteCpnData.success) {
    throw new Error("DELETE /api/coupons/[id] failed");
  }
  console.log("✓ Unused coupon permanent deletion verified.");

  console.log("\n--- TEST 14: Audit Logs Verification ---");
  const couponAuditLogs = await AuditLog.find({
    resource: "Coupon",
    resourceId: String(createdCouponId),
  }).lean();
  console.log(`Found ${couponAuditLogs.length} audit log entries for test coupon.`);
  if (couponAuditLogs.length === 0) {
    throw new Error("Audit log entry not recorded for coupon operations!");
  }
  console.log("✓ Marketing audit logging verified.");

  console.log("\n==================================================");
  console.log("🎉 ALL 14 PHASE 8 HTTP API TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runPhase8ApiE2E().catch((err) => {
  console.error("❌ Phase 8 API E2E failed:", err);
  process.exit(1);
});
