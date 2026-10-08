import { connectToDatabase } from "../src/lib/mongoose.js";
import { getCustomerListMetrics } from "../src/lib/customer-service.js";
import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";

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

async function verifyCustomerMetrics() {
  console.log("==================================================");
  console.log("TESTING CUSTOMER METRICS COMPLETENESS & ROBUSTNESS");
  console.log("==================================================");

  await connectToDatabase();

  // Test 1: Direct Service Call
  console.log("\n--- TEST 1: Direct Service getCustomerListMetrics() ---");
  const metrics = await getCustomerListMetrics();
  console.log("Returned Metrics:", metrics);

  const requiredFields = [
    "totalCustomers",
    "activeCustomers",
    "inactiveCustomers",
    "blockedCustomers",
    "newLast30Days",
    "totalOrders",
    "totalSpend",
    "averageOrderValue",
    "itemsPurchased",
  ];

  for (const field of requiredFields) {
    if (typeof metrics[field] !== "number") {
      throw new Error(`Field '${field}' is missing or not a number in getCustomerListMetrics! Value: ${metrics[field]}`);
    }
  }
  console.log("✓ All 9 required metrics fields are strictly numeric.");

  // Test 2: HTTP API Call
  console.log("\n--- TEST 2: HTTP API GET /api/customers ---");
  const token = await createSuperAdminToken();
  const res = await fetch(`${BASE_URL}/api/customers?page=1&limit=10`, {
    headers: {
      "Content-Type": "application/json",
      Cookie: `admin_session=${token}`,
    },
  });

  const data = await res.json();
  console.log(`HTTP Status: ${res.status}, success: ${data.success}`);
  if (!data.success) {
    throw new Error(`GET /api/customers returned failure: ${data.error}`);
  }

  const apiMetrics = data.metrics || data.data?.metrics;
  console.log("API Metrics:", apiMetrics);

  for (const field of requiredFields) {
    if (typeof apiMetrics[field] !== "number") {
      throw new Error(`API Field '${field}' is missing or not a number in API response! Value: ${apiMetrics[field]}`);
    }
  }
  console.log("✓ API metrics payload satisfies the contract with all 9 fields as numbers.");

  // Test 3: Formatting & defensive UI simulation
  console.log("\n--- TEST 3: Simulating UI Formatting Calls ---");
  const testScenarios = [
    apiMetrics,
    {}, // empty object
    undefined, // undefined response
    { totalCustomers: 0, newLast30Days: 0 },
  ];

  for (const [idx, scenario] of testScenarios.entries()) {
    const totalCustomersStr = (scenario?.totalCustomers ?? 0).toLocaleString("en-IN");
    const activeCustomersStr = (scenario?.activeCustomers ?? 0).toLocaleString("en-IN");
    const newLast30DaysStr = (scenario?.newLast30Days ?? 0).toLocaleString("en-IN");
    const spend = scenario?.totalSpend ?? scenario?.totalCustomerSpend ?? 0;

    console.log(`Scenario ${idx + 1}: totalCustomers="${totalCustomersStr}", active="${activeCustomersStr}", newLast30="${newLast30DaysStr}", spend=${spend}`);
  }
  console.log("✓ All formatting simulations executed without runtime errors.");

  console.log("\n==================================================");
  console.log("🎉 ALL METRICS VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================\n");
  process.exit(0);
}

verifyCustomerMetrics().catch((err) => {
  console.error("❌ Metrics Test Failed:", err);
  process.exit(1);
});
