import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";

async function createAdminToken() {
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

async function runApiTests() {
  console.log("==================================================");
  console.log("🌐 TESTING PHASE 6 ORDERS HTTP API ENDPOINTS");
  console.log("==================================================");

  const token = await createAdminToken();

  // Test 1: Unauthenticated GET /api/orders
  console.log("Testing unauthenticated access to /api/orders...");
  const unauthRes = await fetch(`${BASE_URL}/api/orders`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }
  console.log("✅ [1/5] Unauthenticated request correctly rejected with 401 Unauthorized");

  // Test 2: Authenticated GET /api/orders
  console.log("Testing authenticated access to /api/orders...");
  const authRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Cookie: `admin_session=${token}` },
  });
  if (!authRes.ok) {
    const text = await authRes.text();
    throw new Error(`GET /api/orders failed: ${authRes.status} - ${text}`);
  }
  const listData = await authRes.json();
  if (!listData.success || !Array.isArray(listData.orders)) {
    throw new Error("Invalid response format from /api/orders");
  }
  console.log(`✅ [2/5] GET /api/orders succeeded: ${listData.orders.length} orders found, total: ${listData.pagination?.total}`);

  // Test 3: Status filter query
  console.log("Testing GET /api/orders?status=PROCESSING...");
  const filterRes = await fetch(`${BASE_URL}/api/orders?status=PROCESSING`, {
    headers: { Cookie: `admin_session=${token}` },
  });
  if (!filterRes.ok) {
    throw new Error(`Filter query failed: ${filterRes.status}`);
  }
  const filterData = await filterRes.json();
  console.log(`✅ [3/5] GET /api/orders?status=PROCESSING returned ${filterData.orders.length} orders`);

  // Test 4: CSV Export endpoint
  console.log("Testing GET /api/orders/export...");
  const exportRes = await fetch(`${BASE_URL}/api/orders/export`, {
    headers: { Cookie: `admin_session=${token}` },
  });
  if (!exportRes.ok) {
    throw new Error(`CSV export failed: ${exportRes.status}`);
  }
  const csvText = await exportRes.text();
  if (!csvText.startsWith("Order Number,Date")) {
    throw new Error("Invalid CSV header format");
  }
  console.log("✅ [4/5] GET /api/orders/export generated valid CSV with appropriate headers");

  // Test 5: Route resolution for /orders page
  console.log("Testing frontend /orders page route response...");
  const pageRes = await fetch(`${BASE_URL}/orders`, {
    headers: { Cookie: `admin_session=${token}` },
  });
  if (!pageRes.ok) {
    throw new Error(`Page /orders failed with status: ${pageRes.status}`);
  }
  console.log("✅ [5/6] Frontend /orders page returned HTTP 200 OK");

  // Test 6: Route resolution for /orders/[id]
  if (listData.orders.length > 0) {
    const sampleOrder = listData.orders[0];
    console.log(`Testing frontend /orders/${sampleOrder.orderNumber} page route...`);
    const detailPageRes = await fetch(`${BASE_URL}/orders/${sampleOrder.orderNumber}`, {
      headers: { Cookie: `admin_session=${token}` },
    });
    if (!detailPageRes.ok) {
      throw new Error(`Page /orders/${sampleOrder.orderNumber} failed with status: ${detailPageRes.status}`);
    }
    console.log(`✅ [6/6] Frontend /orders/${sampleOrder.orderNumber} page returned HTTP 200 OK`);
  }

  console.log("==================================================");
  console.log("🎉 ALL HTTP API & ROUTE TESTS PASSED!");
  console.log("==================================================");
}

runApiTests().catch((err) => {
  console.error("❌ API TEST FAILED:", err);
  process.exit(1);
});
