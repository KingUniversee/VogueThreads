import mongoose from "mongoose";
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

async function runTests() {
  console.log("🧪 [Test Suite] Starting Phase 5 — Inventory Management verification...\n");
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
    const cookieHeader = `admin_session=${token}`;

    const authHeaders = {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    };

    // 2. Test GET /api/inventory & Self-Healing Sync
    console.log("\n📦 Testing GET /api/inventory...");
    const invRes = await fetch(`${BASE_URL}/api/inventory`, { headers: authHeaders });
    const invJson = await invRes.json();

    assert(invJson.success === true, "GET /api/inventory returned success");
    assert(Array.isArray(invJson.data), "Data is an array of variant inventory items");
    assert(invJson.data.length > 0, `Inventory contains ${invJson.data.length} variant SKUs`);
    assert(invJson.summary !== undefined, "Summary telemetry metrics are included");
    assert(typeof invJson.summary.totalSkus === "number", `Total SKUs: ${invJson.summary.totalSkus}`);

    const testItem = invJson.data[0];
    assert(Boolean(testItem.variantSku), `First item has valid SKU: ${testItem.variantSku}`);
    assert(typeof testItem.onHand === "number", `On-hand stock is a number (${testItem.onHand})`);
    assert(typeof testItem.available === "number", `Available stock is a number (${testItem.available})`);
    assert(testItem.productTitle !== undefined, `Product title mapped: "${testItem.productTitle}"`);

    // 3. Test Atomic Stock Adjustment: RESTOCK
    console.log("\n📈 Testing POST /api/inventory/adjust (RESTOCK)...");
    const targetSku = testItem.variantSku;
    const initialOnHand = testItem.onHand;
    const initialAvailable = testItem.available;

    const restockRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        sku: targetSku,
        type: "RESTOCK",
        mode: "INCREMENT",
        delta: 25,
        reason: "Supplier batch delivery PO-2026-TEST",
        referenceId: "PO-2026-TEST",
        notes: "Automated test restock entry",
      }),
    });

    const restockJson = await restockRes.json();
    assert(restockJson.success === true, `RESTOCK succeeded for ${targetSku}`);
    assert(restockJson.data.onHand === initialOnHand + 25, `On-hand incremented by 25 (${initialOnHand} -> ${restockJson.data.onHand})`);
    assert(restockJson.data.available === initialAvailable + 25, `Available incremented by 25 (${initialAvailable} -> ${restockJson.data.available})`);
    assert(restockJson.transaction !== undefined, "Double-entry ledger transaction created");
    assert(restockJson.transaction.delta === 25, "Transaction recorded delta: +25");
    assert(restockJson.transaction.type === "RESTOCK", "Transaction type is RESTOCK");

    // 4. Test Catalog Sync: Verify Product.variants[i].cachedStock is updated
    console.log("\n🔄 Testing Catalog Product Variant Synchronization...");
    const updatedProduct = await mongoose.connection
      .collection("products")
      .findOne({ _id: new mongoose.Types.ObjectId(testItem.productId) });

    const syncedVariant = updatedProduct.variants.find((v) => v.sku === targetSku);
    assert(Boolean(syncedVariant), `Product document contains variant ${targetSku}`);
    assert(
      syncedVariant.cachedStock.onHand === initialOnHand + 25,
      `Product variant cachedStock.onHand (${syncedVariant.cachedStock.onHand}) matches Inventory`
    );
    assert(
      syncedVariant.cachedStock.available === initialAvailable + 25,
      `Product variant cachedStock.available (${syncedVariant.cachedStock.available}) matches Inventory`
    );

    // 5. Test Negative Inventory Prevention
    console.log("\n🛡️ Testing Negative Inventory Prevention...");
    const badDeductionRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        sku: targetSku,
        type: "DAMAGE_WRITE_OFF",
        mode: "INCREMENT",
        delta: -(restockJson.data.onHand + 100), // Exceeds stock
        reason: "Invalid deduction test",
      }),
    });

    const badDeductionJson = await badDeductionRes.json();
    assert(
      badDeductionRes.status === 400 && badDeductionJson.success === false,
      `Excess deduction rejected with 400 Bad Request: "${badDeductionJson.error}"`
    );

    // 6. Test Damage Write-Off Adjustment
    console.log("\n📉 Testing POST /api/inventory/adjust (DAMAGE_WRITE_OFF)...");
    const damageRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        sku: targetSku,
        type: "DAMAGE_WRITE_OFF",
        mode: "INCREMENT",
        delta: -5,
        reason: "Fabric defect found during dispatch inspection",
        referenceId: "QC-DEFECT-01",
      }),
    });

    const damageJson = await damageRes.json();
    assert(damageJson.success === true, "Damage write-off succeeded");
    assert(
      damageJson.data.onHand === initialOnHand + 20,
      `On-hand properly deducted by 5 (${initialOnHand + 25} -> ${damageJson.data.onHand})`
    );

    // 7. Test Physical Audit Mode (SET)
    console.log("\n📋 Testing POST /api/inventory/adjust (PHYSICAL_AUDIT SET mode)...");
    const auditRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        sku: targetSku,
        type: "PHYSICAL_AUDIT",
        mode: "SET",
        newQuantity: 30,
        reason: "Quarterly physical warehouse cycle count",
        referenceId: "AUDIT-Q3-2026",
      }),
    });

    const auditJson = await auditRes.json();
    assert(auditJson.success === true, "Physical audit succeeded");
    assert(auditJson.data.onHand === 30, "On-hand set exactly to 30 units");

    // 8. Test GET /api/inventory/adjustments
    console.log("\n📜 Testing GET /api/inventory/adjustments...");
    const adjHistoryRes = await fetch(
      `${BASE_URL}/api/inventory/adjustments?sku=${encodeURIComponent(targetSku)}`,
      { headers: authHeaders }
    );
    const adjHistoryJson = await adjHistoryRes.json();

    assert(adjHistoryJson.success === true, "GET /api/inventory/adjustments returned success");
    assert(Array.isArray(adjHistoryJson.data), "History data is an array");
    assert(adjHistoryJson.data.length >= 3, `Found ${adjHistoryJson.data.length} transactions for ${targetSku}`);
    assert(adjHistoryJson.stats.totalTransactions > 0, `Stats total transactions: ${adjHistoryJson.stats.totalTransactions}`);
    assert(adjHistoryJson.stats.totalUnitsAdded > 0, `Stats units added: +${adjHistoryJson.stats.totalUnitsAdded}`);

    // 9. Test PATCH /api/inventory/threshold
    console.log("\n⚙️ Testing PATCH /api/inventory/threshold...");
    const threshRes = await fetch(`${BASE_URL}/api/inventory/threshold`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({
        sku: targetSku,
        threshold: 8,
      }),
    });
    const threshJson = await threshRes.json();

    assert(threshJson.success === true, "Threshold update succeeded");
    assert(threshJson.data[0].lowStockThreshold === 8, "New threshold persisted: 8");

    // 10. Test GET /api/inventory/low-stock
    console.log("\n⚠️ Testing GET /api/inventory/low-stock...");
    const lowStockRes = await fetch(`${BASE_URL}/api/inventory/low-stock`, { headers: authHeaders });
    const lowStockJson = await lowStockRes.json();

    assert(lowStockJson.success === true, "GET /api/inventory/low-stock returned success");
    assert(Array.isArray(lowStockJson.data), "Low stock items is an array");
    assert(lowStockJson.metrics !== undefined, "Low stock urgency metrics are provided");

    // Verify all returned items satisfy available <= lowStockThreshold
    const allViolationsSatisfied = lowStockJson.data.every(
      (item) => item.available <= item.threshold
    );
    assert(
      allViolationsSatisfied,
      "Every item in low-stock feed satisfies (available <= lowStockThreshold)"
    );

    // 11. Test GET /api/inventory/export (CSV)
    console.log("\n📊 Testing GET /api/inventory/export...");
    const exportRes = await fetch(`${BASE_URL}/api/inventory/export`, {
      headers: { Cookie: cookieHeader },
    });
    const exportCsv = await exportRes.text();

    assert(exportRes.status === 200, "CSV export returned 200 OK");
    assert(exportCsv.includes("SKU,Product Title,Category"), "CSV contains proper header row");
    assert(exportCsv.includes(targetSku), `CSV export contains SKU ${targetSku}`);

    // 12. Test Route Rendering & Forwarder Health
    console.log("\n🌐 Testing Page Routes & Aliases Health...");
    const routesToTest = [
      "/inventory",
      "/inventory/adjustments",
      "/inventory/low-stock",
    ];

    for (const route of routesToTest) {
      const pageRes = await fetch(`${BASE_URL}${route}`, {
        headers: { Cookie: cookieHeader },
      });
      assert(pageRes.status === 200, `Page route ${route} returned HTTP 200`);
    }

    // Test Redirects for Aliases
    const alias1 = await fetch(`${BASE_URL}/stock-adjustments`, {
      headers: { Cookie: cookieHeader },
      redirect: "manual",
    });
    assert(
      alias1.status === 307 || alias1.status === 308 || alias1.status === 200,
      `URL alias /stock-adjustments handled (status ${alias1.status})`
    );

    const alias2 = await fetch(`${BASE_URL}/low-stock`, {
      headers: { Cookie: cookieHeader },
      redirect: "manual",
    });
    assert(
      alias2.status === 307 || alias2.status === 308 || alias2.status === 200,
      `URL alias /low-stock handled (status ${alias2.status})`
    );

    // 13. Test RBAC Security Guard: Unauthorized requests rejected
    console.log("\n🔒 Testing RBAC Security Enforcement...");
    const unauthRes = await fetch(`${BASE_URL}/api/inventory`);
    assert(
      unauthRes.status === 401 || unauthRes.status === 403,
      `Unauthenticated GET /api/inventory rejected with ${unauthRes.status}`
    );

    const unauthPostRes = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku: targetSku, type: "RESTOCK", delta: 10, reason: "Test" }),
    });
    assert(
      unauthPostRes.status === 401 || unauthPostRes.status === 403,
      `Unauthenticated POST /api/inventory/adjust rejected with ${unauthPostRes.status}`
    );

    // Summary
    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Test suite encountered fatal error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
