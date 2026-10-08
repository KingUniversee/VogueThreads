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
  console.log("🧪 [Test Suite] Running Exact Stock Adjustment Sign/Quantity Cases (A through L)...\n");
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

    // Find a test variant
    const invItem = await mongoose.connection
      .collection("inventories")
      .findOne({});

    if (!invItem) {
      throw new Error("No inventory item found in database to test");
    }

    const testSku = invItem.variantSku;
    console.log(`Using SKU '${testSku}' for testing.\n`);

    // Helper to reset stock to exactly 30
    const resetStockTo30 = async () => {
      const res = await fetch(`${BASE_URL}/api/inventory/adjust`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          sku: testSku,
          type: "PHYSICAL_AUDIT",
          mode: "SET",
          newQuantity: 30,
          reason: "Reset baseline to 30 units for testing",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Failed to reset stock: " + json.error);
    };

    const getDbOnHand = async () => {
      const doc = await mongoose.connection
        .collection("inventories")
        .findOne({ variantSku: testSku });
      return doc.onHand;
    };

    // Case A: Restock +6 (30 -> 36)
    console.log("--- Case A: Restock +6 (30 -> 36) ---");
    await resetStockTo30();
    const resA = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "RESTOCK",
        quantity: 6,
        reason: "Supplier batch test",
      }),
    });
    const jsonA = await resA.json();
    assert(resA.ok && jsonA.success === true, "Case A API returned success");
    assert(jsonA.data.onHand === 36, `Case A onHand is 36 (was ${(await getDbOnHand())})`);
    assert(jsonA.transaction.delta === 6, "Case A transaction delta is +6");
    assert(jsonA.transaction.quantityChange === 6, "Case A transaction quantityChange is +6");

    // Case B: Restock -6 (Must NOT silently become +6, must reject with validation error)
    console.log("\n--- Case B: Restock -6 (Must reject with validation error) ---");
    const resB = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "RESTOCK",
        quantity: -6,
        reason: "Invalid negative restock test",
      }),
    });
    const jsonB = await resB.json();
    assert(resB.status === 400 && jsonB.success === false, "Case B rejected with 400 Bad Request");
    assert(
      jsonB.error.toLowerCase().includes("positive"),
      `Case B returned clear validation error: "${jsonB.error}"`
    );
    assert((await getDbOnHand()) === 36, "Case B database was NOT modified (remained 36)");

    // Case C: Damage 6 (30 -> 24)
    console.log("\n--- Case C: Damage 6 (30 -> 24) ---");
    await resetStockTo30();
    const resC = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "DAMAGE_WRITE_OFF",
        quantity: 6,
        reason: "Damaged fabric write-off",
      }),
    });
    const jsonC = await resC.json();
    assert(resC.ok && jsonC.success === true, "Case C API returned success");
    assert(jsonC.data.onHand === 24, `Case C onHand is 24 (${jsonC.data.onHand})`);
    assert(jsonC.transaction.delta === -6, "Case C transaction delta is -6");
    assert(jsonC.transaction.quantityChange === -6, "Case C transaction quantityChange is -6");

    // Case D: Shrinkage 6 (30 -> 24)
    console.log("\n--- Case D: Shrinkage 6 (30 -> 24) ---");
    await resetStockTo30();
    const resD = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "SHRINKAGE",
        quantity: 6,
        reason: "Warehouse count variance write-off",
      }),
    });
    const jsonD = await resD.json();
    assert(resD.ok && jsonD.success === true, "Case D API returned success");
    assert(jsonD.data.onHand === 24, `Case D onHand is 24 (${jsonD.data.onHand})`);
    assert(jsonD.transaction.delta === -6, "Case D transaction delta is -6");
    assert(jsonD.transaction.quantityChange === -6, "Case D transaction quantityChange is -6");

    // Case E: Return 6 (30 -> 36)
    console.log("\n--- Case E: Return 6 (30 -> 36) ---");
    await resetStockTo30();
    const resE = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "RETURN_RESTOCK",
        quantity: 6,
        reason: "Customer return restocked",
      }),
    });
    const jsonE = await resE.json();
    assert(resE.ok && jsonE.success === true, "Case E API returned success");
    assert(jsonE.data.onHand === 36, `Case E onHand is 36 (${jsonE.data.onHand})`);
    assert(jsonE.transaction.delta === 6, "Case E transaction delta is +6");
    assert(jsonE.transaction.quantityChange === 6, "Case E transaction quantityChange is +6");

    // Case F: Correction +6 (30 -> 36)
    console.log("\n--- Case F: Correction +6 (30 -> 36) ---");
    await resetStockTo30();
    const resF = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "CORRECTION",
        delta: 6,
        reason: "Correction adding 6 units",
      }),
    });
    const jsonF = await resF.json();
    assert(resF.ok && jsonF.success === true, "Case F API returned success");
    assert(jsonF.data.onHand === 36, `Case F onHand is 36 (${jsonF.data.onHand})`);
    assert(jsonF.transaction.delta === 6, "Case F transaction delta is +6");
    assert(jsonF.transaction.quantityChange === 6, "Case F transaction quantityChange is +6");

    // Case G: Correction -6 (30 -> 24)
    console.log("\n--- Case G: Correction -6 (30 -> 24) ---");
    await resetStockTo30();
    const resG = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "CORRECTION",
        delta: -6,
        reason: "Correction deducting 6 units",
      }),
    });
    const jsonG = await resG.json();
    assert(resG.ok && jsonG.success === true, "Case G API returned success");
    assert(jsonG.data.onHand === 24, `Case G onHand is 24 (${jsonG.data.onHand})`);
    assert(jsonG.transaction.delta === -6, "Case G transaction delta is -6");
    assert(jsonG.transaction.quantityChange === -6, "Case G transaction quantityChange is -6");

    // Case H: Audit Count 24 (30 -> 24)
    console.log("\n--- Case H: Audit Count 24 (30 -> 24) ---");
    await resetStockTo30();
    const resH = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "PHYSICAL_AUDIT",
        newQuantity: 24,
        reason: "Quarterly count",
      }),
    });
    const jsonH = await resH.json();
    assert(resH.ok && jsonH.success === true, "Case H API returned success");
    assert(jsonH.data.onHand === 24, `Case H onHand is 24 (${jsonH.data.onHand})`);
    assert(jsonH.transaction.delta === -6, "Case H transaction delta is -6");
    assert(jsonH.transaction.quantityChange === -6, "Case H transaction quantityChange is -6");

    // Case I: Damage 40 with only 30 available (Must reject, database remains 30)
    console.log("\n--- Case I: Damage 40 with only 30 available (Must reject) ---");
    await resetStockTo30();
    const resI = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "DAMAGE_WRITE_OFF",
        quantity: 40,
        reason: "Attempting to damage more than in stock",
      }),
    });
    const jsonI = await resI.json();
    assert(resI.status === 400 && jsonI.success === false, "Case I rejected with 400 Bad Request");
    assert(
      jsonI.error.includes("Insufficient stock. Only 30 units are available"),
      `Case I returned exact error: "${jsonI.error}"`
    );
    assert((await getDbOnHand()) === 30, "Case I database was NOT modified (remained 30)");

    // Case J: Empty quantity (Must reject)
    console.log("\n--- Case J: Empty quantity (Must reject) ---");
    const resJ = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "RESTOCK",
        quantity: "",
        reason: "Empty quantity test",
      }),
    });
    const jsonJ = await resJ.json();
    assert(resJ.status === 400 && jsonJ.success === false, "Case J rejected with 400 Bad Request");

    // Case K: Invalid quantity (Must reject)
    console.log("\n--- Case K: Invalid quantity (Must reject) ---");
    const resK = await fetch(`${BASE_URL}/api/inventory/adjust`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        sku: testSku,
        type: "RESTOCK",
        quantity: "abc_invalid",
        reason: "Invalid quantity test",
      }),
    });
    const jsonK = await resK.json();
    assert(resK.status === 400 && jsonK.success === false, "Case K rejected with 400 Bad Request");

    // Case L: Verify stock ledger records the correct signed quantityChange
    console.log("\n--- Case L: Verify stock ledger records correct signed quantityChange ---");
    const historyRes = await fetch(
      `${BASE_URL}/api/inventory/adjustments?sku=${encodeURIComponent(testSku)}&limit=50`,
      { headers }
    );
    const historyJson = await historyRes.json();
    assert(historyRes.ok && historyJson.success, "Case L history fetched successfully");
    assert(historyJson.data.length >= 6, `Case L found ${historyJson.data.length} ledger transactions`);

    // Verify negative delta transactions are indeed negative in ledger
    const damageTx = historyJson.data.find((tx) => tx.type === "DAMAGE_WRITE_OFF");
    assert(damageTx && damageTx.delta === -6, `Damage transaction delta in ledger is negative (-6): ${damageTx?.delta}`);

    const restockTx = historyJson.data.find((tx) => tx.type === "RESTOCK" && tx.delta === 6);
    assert(restockTx && restockTx.delta === 6, `Restock transaction delta in ledger is positive (+6): ${restockTx?.delta}`);

    const correctionMinusTx = historyJson.data.find(
      (tx) => (tx.type === "CORRECTION" || tx.type === "MANUAL_ADJUSTMENT") && tx.delta === -6
    );
    assert(
      correctionMinusTx && correctionMinusTx.delta === -6,
      `Correction -6 transaction delta in ledger is negative (-6): ${correctionMinusTx?.delta}`
    );

    console.log("\n========================================");
    console.log(`Cases A-L Results: ${passed} passed, ${failed} failed`);
    console.log("========================================\n");

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error("❌ Test suite encountered fatal error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
