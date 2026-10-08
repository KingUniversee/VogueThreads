import mongoose from "mongoose";
import { SignJWT } from "jose";

const BASE_URL = "http://localhost:3000";
const SECRET_KEY =
  process.env.NEXTAUTH_SECRET ||
  "fashion_admin_enterprise_secret_session_development_key_12345";

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

async function runTests() {
  console.log("🧪 [Test Suite] Low Stock Alert & Inventory Consistency Verification...\n");
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/fashion_commerce_admin");
    const token = await createSuperAdminToken();
    const headers = {
      Cookie: `admin_session=${token}`,
      "Content-Type": "application/json",
    };

    // Find our test SKU
    const invItem = await mongoose.connection.collection("inventories").findOne({});
    if (!invItem) throw new Error("No inventory item found in database");
    const testSku = invItem.variantSku;
    console.log(`Using SKU '${testSku}' for testing.\n`);

    // Helper to set threshold
    const setThreshold = async (thresh) => {
      const res = await fetch(`${BASE_URL}/api/inventory/threshold`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sku: testSku, threshold: thresh }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Failed to set threshold: " + json.error);
    };

    // Helper to set exact stock
    const setExactStock = async (qty, reason = "Test Baseline Set") => {
      const res = await fetch(`${BASE_URL}/api/inventory/adjust`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sku: testSku,
          type: "PHYSICAL_AUDIT",
          mode: "SET",
          newQuantity: qty,
          reason,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Failed to adjust stock: " + json.error);
      return json.data;
    };

    // Helper to fetch low-stock feed
    const getLowStockFeed = async () => {
      const res = await fetch(`${BASE_URL}/api/inventory/low-stock?_t=${Date.now()}`, {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      return { res, json };
    };

    // Helper to fetch inventory list item
    const getInventoryItem = async () => {
      const res = await fetch(`${BASE_URL}/api/inventory?search=${encodeURIComponent(testSku)}&_t=${Date.now()}`, {
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      const item = (json.data || []).find((i) => i.variantSku === testSku);
      return { res, json, item, summary: json.summary };
    };

    // 0. Verify Anti-Caching Headers
    console.log("--- Test 0: Verify Anti-Caching Headers ---");
    const { res: lowStockRes } = await getLowStockFeed();
    const cacheHeader = lowStockRes.headers.get("cache-control") || "";
    assert(cacheHeader.includes("no-store"), `Low stock API returns Cache-Control: no-store (${cacheHeader})`);

    const { res: invRes } = await getInventoryItem();
    const invCacheHeader = invRes.headers.get("cache-control") || "";
    assert(invCacheHeader.includes("no-store"), `Inventory API returns Cache-Control: no-store (${invCacheHeader})`);

    // ========================================================
    // User Section 7 Flow Verification
    // ========================================================
    console.log("\n--- Section 7 Step 1: Baseline Available = 50, Threshold = 8 ---");
    await setThreshold(8);
    await setExactStock(50, "Set baseline to 50");

    const step1Inv = await getInventoryItem();
    assert(step1Inv.item.available === 50, "Inventory shows Available = 50");
    assert(step1Inv.item.lowStockThreshold === 8, "Inventory shows Threshold = 8");
    assert(step1Inv.item.status === "IN_STOCK", "Inventory shows Status = IN_STOCK");

    const step1LowStock = await getLowStockFeed();
    const step1Alert = (step1LowStock.json.data || []).find((i) => i.variantSku === testSku);
    assert(!step1Alert, "SKU MUST NOT appear on Low Stock page (50 > 8)");
    assert(step1LowStock.json.metrics.outOfStock === 0, "Low stock metrics outOfStock = 0");

    console.log("\n--- Section 7 Step 2: Adjust -6 (Available: 50 -> 44) ---");
    const adjust2Res = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "DAMAGE_WRITE_OFF",
        quantity: 6,
        reason: "Defect inspection test",
      }),
    });
    const adjust2Json = await adjust2Res.json();
    assert(adjust2Res.ok && adjust2Json.success, "Adjustment -6 succeeded");
    assert(adjust2Json.data.available === 44, "Adjust API returned available = 44");

    const step2Inv = await getInventoryItem();
    assert(step2Inv.item.available === 44, "Inventory shows Available = 44");
    assert(step2Inv.item.status === "IN_STOCK", "Inventory shows Status = IN_STOCK");

    const step2LowStock = await getLowStockFeed();
    const step2Alert = (step2LowStock.json.data || []).find((i) => i.variantSku === testSku);
    assert(!step2Alert, "Still IN STOCK: SKU MUST NOT appear on Low Stock page (44 > 8)");

    console.log("\n--- Section 7 Step 3: Adjust -37 (Available: 44 -> 7) ---");
    const adjust3Res = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "CORRECTION",
        mode: "INCREMENT",
        delta: -37,
        reason: "Stock correction test",
      }),
    });
    const adjust3Json = await adjust3Res.json();
    assert(adjust3Res.ok && adjust3Json.success, "Adjustment -37 succeeded");
    assert(adjust3Json.data.available === 7, "Adjust API returned available = 7");

    const step3Inv = await getInventoryItem();
    assert(step3Inv.item.available === 7, "Inventory shows Available = 7");
    assert(step3Inv.item.status === "LOW_STOCK", "Inventory shows Status = LOW_STOCK");

    const step3LowStock = await getLowStockFeed();
    const step3Alert = (step3LowStock.json.data || []).find((i) => i.variantSku === testSku);
    assert(Boolean(step3Alert), "Now LOW STOCK: Alert MUST appear on Low Stock page (7 <= 8)");
    assert(step3Alert?.available === 7, "Low Stock item available = 7");
    assert(step3Alert?.threshold === 8, "Low Stock item threshold = 8");
    assert(step3Alert?.urgency === "LOW_STOCK", "Low Stock item urgency = LOW_STOCK");
    assert(step3LowStock.json.metrics.lowStock >= 1, "Low Stock counter >= 1");
    assert(step3LowStock.json.metrics.totalAlerts >= 1, "Total Alerts counter >= 1");

    console.log("\n--- Section 7 Step 4: Adjust -7 (Available: 7 -> 0) ---");
    const adjust4Res = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "DAMAGE_WRITE_OFF",
        quantity: 7,
        reason: "Write-off test to zero",
      }),
    });
    const adjust4Json = await adjust4Res.json();
    assert(adjust4Res.ok && adjust4Json.success, "Adjustment -7 succeeded");
    assert(adjust4Json.data.available === 0, "Adjust API returned available = 0");

    const step4Inv = await getInventoryItem();
    assert(step4Inv.item.available === 0, "Inventory shows Available = 0");
    assert(step4Inv.item.status === "OUT_OF_STOCK", "Inventory shows Status = OUT_OF_STOCK");

    const step4LowStock = await getLowStockFeed();
    const step4Alert = (step4LowStock.json.data || []).find((i) => i.variantSku === testSku);
    assert(Boolean(step4Alert), "Now OUT OF STOCK: Alert appears in Low Stock feed (0 <= 8)");
    assert(step4Alert?.available === 0, "Low Stock item available = 0");
    assert(step4Alert?.urgency === "OUT_OF_STOCK", "Low Stock item urgency = OUT_OF_STOCK");
    assert(step4LowStock.json.metrics.outOfStock >= 1, "Out of Stock counter >= 1");

    console.log("\n--- Section 7 Step 5: Restock +10 (Available: 0 -> 10) ---");
    const adjust5Res = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "RESTOCK",
        quantity: 10,
        reason: "Restock replenishment test",
      }),
    });
    const adjust5Json = await adjust5Res.json();
    assert(adjust5Res.ok && adjust5Json.success, "Restock +10 succeeded");
    assert(adjust5Json.data.available === 10, "Adjust API returned available = 10");

    const step5Inv = await getInventoryItem();
    assert(step5Inv.item.available === 10, "Inventory shows Available = 10");
    assert(step5Inv.item.status === "IN_STOCK", "Inventory shows Status = IN_STOCK");

    const step5LowStock = await getLowStockFeed();
    const step5Alert = (step5LowStock.json.data || []).find((i) => i.variantSku === testSku);
    assert(!step5Alert, "Now IN STOCK: Low Stock alert MUST DISAPPEAR (10 > 8)");

    // ========================================================
    // Section 6: Reserved Quantity Logic Verification
    // ========================================================
    console.log("\n--- Section 6: Reserved Quantity vs Available Stock ---");
    // Directly update reserved in DB to test availableQuantity = stockQuantity - reservedQuantity
    await mongoose.connection.collection("inventories").updateOne(
      { variantSku: testSku },
      {
        $set: {
          onHand: 10,
          reserved: 4,
          available: 6, // 10 - 4 = 6
        },
      }
    );

    const resItem = await getInventoryItem();
    assert(resItem.item.onHand === 10, "Physical On-Hand is 10");
    assert(resItem.item.reserved === 4, "Reserved is 4");
    assert(resItem.item.available === 6, "Available is 6 (10 - 4)");
    assert(resItem.item.status === "LOW_STOCK", "Status is LOW_STOCK (6 <= 8)");

    const resLowStock = await getLowStockFeed();
    const resAlert = (resLowStock.json.data || []).find((i) => i.variantSku === testSku);
    assert(Boolean(resAlert), "SKU appears in Low Stock with available = 6");
    assert(resAlert?.available === 6, "Low Stock item available reflects 6, not raw on-hand (10)");

    // Reset back to healthy stock = 50, reserved = 0
    await mongoose.connection.collection("inventories").updateOne(
      { variantSku: testSku },
      {
        $set: {
          onHand: 50,
          reserved: 0,
          available: 50,
        },
      }
    );

    console.log("\n========================================");
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log("========================================\n");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("❌ Test suite fatal error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
