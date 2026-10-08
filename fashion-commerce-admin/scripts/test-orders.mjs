import mongoose from "mongoose";
import Order from "../src/models/Order.js";
import Product from "../src/models/Product.js";
import Inventory from "../src/models/Inventory.js";
import InventoryTransaction from "../src/models/InventoryTransaction.js";
import AuditLog from "../src/models/AuditLog.js";
import {
  generateOrderNumber,
  validateOrderItemsStock,
  calculateOrderPricing,
  createOrder,
  reserveOrderStock,
  commitOrderStock,
  releaseOrderStock,
  restockReturnedItems,
  getOrderMetrics,
} from "../src/lib/order-service.js";
import {
  canTransition,
  getNextAvailableStatuses,
  isOrderCancellable,
  isOrderReturnable,
} from "../src/lib/order-status.js";
import { getDashboardData } from "../src/lib/dashboard-queries.js";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING PHASE 6 ORDERS VERIFICATION SUITE");
  console.log("==================================================");

  await mongoose.connect(DATABASE_URL);
  console.log("✅ [1/15] Connected to MongoDB:", mongoose.connection.name);

  // Find an existing active product variant in the database
  const sampleProduct = await Product.findOne({
    isDeleted: { $ne: true },
    "variants.0": { $exists: true },
  }).lean();

  if (!sampleProduct) {
    throw new Error("No active product found in database. Run catalog seed first.");
  }

  const testVariant = sampleProduct.variants[0];
  const testSku = testVariant.sku.toUpperCase();
  console.log(`✅ [2/15] Selected test variant: ${sampleProduct.title} (SKU: ${testSku})`);

  // Ensure inventory document exists and record baseline
  let baselineInv = await Inventory.findOne({ variantSku: testSku });
  if (!baselineInv) {
    baselineInv = await Inventory.create({
      variantSku: testSku,
      productId: sampleProduct._id,
      variantId: testVariant.variantId || `var_${testSku}`,
      onHand: 50,
      reserved: 0,
      available: 50,
      lowStockThreshold: 5,
      warehouseLocation: "Main Warehouse",
    });
  }

  const initialOnHand = baselineInv.onHand;
  const initialReserved = baselineInv.reserved;
  const initialAvailable = baselineInv.available;
  console.log(`   Baseline stock for ${testSku} -> OnHand: ${initialOnHand}, Reserved: ${initialReserved}, Available: ${initialAvailable}`);

  // Test 3: Out of Stock guard
  console.log("Testing Out of Stock validation guard...");
  let oosCaught = false;
  try {
    await validateOrderItemsStock([
      { sku: testSku, quantity: initialAvailable + 100, title: sampleProduct.title },
    ]);
  } catch (err) {
    if (err.status === 400 && err.details?.length > 0) {
      oosCaught = true;
    }
  }
  if (!oosCaught) {
    throw new Error("Failed: Out of stock guard did not reject excessive quantity");
  }
  console.log("✅ [3/15] Out of stock guard rejected quantity exceeding available stock (HTTP 400)");

  // Test 4: Order Number Generation
  const generatedOrderNum = await generateOrderNumber();
  if (!generatedOrderNum.startsWith("VT-ORD-")) {
    throw new Error(`Failed: Order number '${generatedOrderNum}' does not match VT-ORD- pattern`);
  }
  console.log(`✅ [4/15] Sequential Order Number generated: ${generatedOrderNum}`);

  // Test 5: Pricing and GST calculation
  const pricingResult = calculateOrderPricing({
    items: [
      {
        sku: testSku,
        title: sampleProduct.title,
        color: testVariant.color?.name || "Black",
        colorHex: testVariant.color?.hex || "#000000",
        size: testVariant.size || "M",
        unitPrice: 1000,
        quantity: 2,
        gstRate: 5,
        hsnCode: "6109",
      },
    ],
    discountAmount: 200,
    shippingFee: 100,
    codFee: 0,
    couponCode: "SAVE200",
    isInterState: false,
  });

  const { items: calcItems, pricing: calcPricing } = pricingResult;
  if (calcPricing.subtotal !== 2000) throw new Error(`Expected subtotal 2000, got ${calcPricing.subtotal}`);
  if (calcPricing.taxBreakdown.totalTax !== 100) throw new Error(`Expected total tax 100, got ${calcPricing.taxBreakdown.totalTax}`);
  if (calcPricing.grandTotal !== 2000) throw new Error(`Expected grand total 2000 (2000+100+100-200), got ${calcPricing.grandTotal}`);
  console.log(`✅ [5/15] Pricing & GST calculated: Subtotal=₹${calcPricing.subtotal}, Tax=₹${calcPricing.taxBreakdown.totalTax}, GrandTotal=₹${calcPricing.grandTotal}`);

  // Test 6: Create Order with Stock Reservation
  console.log("Creating Test Order 1 with 2 units...");
  const order1 = await createOrder(
    {
      customerId: sampleProduct._id,
      customerDetails: {
        name: "Aarav Sharma",
        email: "aarav.test@voguethreads.in",
        phone: "+91 9876543210",
      },
      status: "CONFIRMED",
      payment: {
        method: "UPI",
        status: "PAID",
        transactionId: "pay_test_1029384",
      },
      shippingAddress: {
        fullName: "Aarav Sharma",
        phone: "+91 9876543210",
        addressLine1: "Flat 402, Prestige Tower",
        city: "Bengaluru",
        state: "Karnataka",
        pinCode: "560001",
      },
      items: [
        {
          productId: sampleProduct._id,
          variantId: testVariant.variantId || `var_${testSku}`,
          sku: testSku,
          title: sampleProduct.title,
          color: testVariant.color?.name || "Black",
          colorHex: testVariant.color?.hex || "#000000",
          size: testVariant.size || "M",
          unitPrice: 1000,
          quantity: 2,
          gstRate: 5,
        },
      ],
      pricing: {
        discountAmount: 200,
        shippingFee: 100,
      },
    },
    { email: "tester@voguethreads.internal", id: sampleProduct._id }
  );

  console.log(`   Order created: ${order1.orderNumber} (ID: ${order1._id})`);

  // Verify stock was reserved
  const invAfterOrder1 = await Inventory.findOne({ variantSku: testSku });
  if (invAfterOrder1.reserved !== initialReserved + 2) {
    throw new Error(`Reserved stock expected ${initialReserved + 2}, got ${invAfterOrder1.reserved}`);
  }
  if (invAfterOrder1.available !== initialAvailable - 2) {
    throw new Error(`Available stock expected ${initialAvailable - 2}, got ${invAfterOrder1.available}`);
  }
  if (invAfterOrder1.onHand !== initialOnHand) {
    throw new Error(`On-hand stock must remain unchanged during reservation. Expected ${initialOnHand}, got ${invAfterOrder1.onHand}`);
  }
  console.log("✅ [6/15] Order creation atomically reserved stock (Reserved +2, Available -2, OnHand unchanged)");

  // Test 7: Verify ORDER_RESERVED transaction in ledger
  const reserveTx = await InventoryTransaction.findOne({
    referenceId: order1.orderNumber,
    type: "ORDER_RESERVED",
  });
  if (!reserveTx) {
    throw new Error("Missing ORDER_RESERVED ledger entry");
  }
  console.log(`✅ [7/15] Immutable InventoryTransaction created: ${reserveTx.type} for ${testSku}`);

  // Test 8: State Machine validations
  if (!canTransition("CONFIRMED", "PROCESSING")) throw new Error("CONFIRMED -> PROCESSING should be valid");
  if (canTransition("CONFIRMED", "DELIVERED")) throw new Error("CONFIRMED -> DELIVERED should be INVALID");
  if (canTransition("CONFIRMED", "RETURNED")) throw new Error("CONFIRMED -> RETURNED should be INVALID");
  console.log("✅ [8/15] State machine correctly validated valid and invalid transitions");

  // Test 9: Transition to PROCESSING then to PACKED
  order1.status = "PROCESSING";
  await order1.save();
  order1.status = "PACKED";
  await order1.save();
  console.log("✅ [9/15] Order transitioned: CONFIRMED -> PROCESSING -> PACKED");

  // Test 10: Transition to SHIPPED and stock fulfillment commitment
  console.log("Dispatching order (PACKED -> SHIPPED)...");
  await commitOrderStock(order1, { email: "tester@voguethreads.internal" });
  order1.status = "SHIPPED";
  order1.fulfillment = {
    carrier: "DELHIVERY",
    awbNumber: "DEL-TEST-994821",
    trackingUrl: "https://delhivery.com/track/DEL-TEST-994821",
    shippedAt: new Date(),
  };
  await order1.save();

  const invAfterShip = await Inventory.findOne({ variantSku: testSku });
  if (invAfterShip.onHand !== initialOnHand - 2) {
    throw new Error(`Expected OnHand ${initialOnHand - 2}, got ${invAfterShip.onHand}`);
  }
  if (invAfterShip.reserved !== initialReserved) {
    throw new Error(`Expected Reserved ${initialReserved}, got ${invAfterShip.reserved}`);
  }
  if (invAfterShip.available !== initialAvailable - 2) {
    throw new Error(`Available must remain constant during dispatch commitment. Expected ${initialAvailable - 2}, got ${invAfterShip.available}`);
  }

  const fulfillTx = await InventoryTransaction.findOne({
    referenceId: order1.orderNumber,
    type: "ORDER_FULFILLED",
  });
  if (!fulfillTx) throw new Error("Missing ORDER_FULFILLED ledger entry");
  console.log("✅ [10/15] Transition to SHIPPED committed warehouse inventory (OnHand -2, Reserved -2, Available constant)");

  // Test 11: Transition to DELIVERED
  order1.status = "DELIVERED";
  order1.fulfillment.deliveredAt = new Date();
  await order1.save();
  console.log("✅ [11/15] Order transitioned: SHIPPED -> DELIVERED");

  // Test 12: Return & Restock Workflow
  console.log("Processing Return with Restock for 1 unit...");
  await restockReturnedItems(order1, [{ sku: testSku, quantity: 1, condition: "GOOD" }], {
    email: "tester@voguethreads.internal",
  });
  order1.returns.push({
    returnId: "RET-TEST-001",
    items: [{ sku: testSku, quantity: 1, reason: "Fit issue", condition: "GOOD" }],
    status: "RESTOCKED",
    refundAmount: 1000,
    requestedAt: new Date(),
    processedAt: new Date(),
    restocked: true,
  });
  order1.status = "RETURNED";
  await order1.save();

  const invAfterRestock = await Inventory.findOne({ variantSku: testSku });
  if (invAfterRestock.onHand !== initialOnHand - 1) {
    throw new Error(`Expected OnHand ${initialOnHand - 1}, got ${invAfterRestock.onHand}`);
  }
  if (invAfterRestock.available !== initialAvailable - 1) {
    throw new Error(`Expected Available ${initialAvailable - 1}, got ${invAfterRestock.available}`);
  }

  const restockTx = await InventoryTransaction.findOne({
    referenceId: order1.orderNumber,
    type: "RETURN_RESTOCK",
  });
  if (!restockTx) throw new Error("Missing RETURN_RESTOCK ledger entry");
  console.log("✅ [12/15] Return restocked 1 unit back into OnHand and Available with RETURN_RESTOCK transaction");

  // Test 13: Order Cancellation & Stock Release on Order 2
  console.log("Creating Test Order 2 (to test cancellation & stock release)...");
  const order2 = await createOrder(
    {
      customerId: sampleProduct._id,
      customerDetails: {
        name: "Priya Nair",
        email: "priya.test@voguethreads.in",
        phone: "+91 9988776655",
      },
      status: "CONFIRMED",
      payment: { method: "COD", status: "PENDING" },
      shippingAddress: {
        fullName: "Priya Nair",
        phone: "+91 9988776655",
        addressLine1: "12 Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400020",
      },
      items: [
        {
          productId: sampleProduct._id,
          variantId: testVariant.variantId || `var_${testSku}`,
          sku: testSku,
          title: sampleProduct.title,
          color: testVariant.color?.name || "Black",
          colorHex: testVariant.color?.hex || "#000000",
          size: testVariant.size || "M",
          unitPrice: 1000,
          quantity: 2,
          gstRate: 5,
        },
      ],
      pricing: {},
    },
    { email: "tester@voguethreads.internal" }
  );

  const invOrder2Reserved = await Inventory.findOne({ variantSku: testSku });
  if (invOrder2Reserved.reserved !== initialReserved + 2) {
    throw new Error(`Order 2 reservation failed. Expected ${initialReserved + 2}, got ${invOrder2Reserved.reserved}`);
  }

  // Cancel Order 2
  console.log("Cancelling Test Order 2...");
  await releaseOrderStock(order2, { email: "tester@voguethreads.internal" });
  order2.status = "CANCELLED";
  order2.cancellation = {
    reason: "Customer Requested Cancellation",
    cancelledBy: "tester@voguethreads.internal",
    cancelledAt: new Date(),
  };
  await order2.save();

  const invOrder2Released = await Inventory.findOne({ variantSku: testSku });
  if (invOrder2Released.reserved !== initialReserved) {
    throw new Error(`Stock release failed. Expected reserved ${initialReserved}, got ${invOrder2Released.reserved}`);
  }

  const cancelTx = await InventoryTransaction.findOne({
    referenceId: order2.orderNumber,
    type: "ORDER_CANCELLED",
  });
  if (!cancelTx) throw new Error("Missing ORDER_CANCELLED ledger entry");
  console.log("✅ [13/15] Order cancellation safely released reserved stock back to sellable inventory");

  // Test 14: Order Metrics Telemetry
  const metrics = await getOrderMetrics();
  if (metrics.totalOrders < 2) {
    throw new Error(`Expected at least 2 orders in metrics, got ${metrics.totalOrders}`);
  }
  console.log(`✅ [14/15] Live Order Metrics verified: Total=${metrics.totalOrders}, Revenue=₹${metrics.totalRevenue}`);

  // Test 15: Dashboard Integration Check
  console.log("Validating Dashboard aggregation query with real orders...");
  const dashboardData = await getDashboardData("30d");
  if (!dashboardData || typeof dashboardData.kpis?.revenue?.value !== "number") {
    throw new Error("Dashboard aggregation failed with live orders");
  }
  console.log(`✅ [15/15] Executive Dashboard query successfully computed metrics with real order data:`, {
    totalRevenue: dashboardData.kpis.revenue.value,
    totalOrders: dashboardData.kpis.orders.value,
    recentOrdersCount: dashboardData.recentOrders?.length,
  });

  // Clean up test orders and restore inventory
  console.log("Cleaning up test orders and restoring baseline stock...");
  await Order.deleteMany({ _id: { $in: [order1._id, order2._id] } });
  await InventoryTransaction.deleteMany({ referenceId: { $in: [order1.orderNumber, order2.orderNumber] } });
  await Inventory.updateOne(
    { variantSku: testSku },
    {
      $set: {
        onHand: initialOnHand,
        reserved: initialReserved,
        available: initialAvailable,
      },
    }
  );
  await Product.updateOne(
    { _id: sampleProduct._id, "variants.sku": testSku },
    {
      $set: {
        "variants.$.cachedStock.onHand": initialOnHand,
        "variants.$.cachedStock.reserved": initialReserved,
        "variants.$.cachedStock.available": initialAvailable,
      },
    }
  );

  console.log("==================================================");
  console.log("🎉 ALL 15 PHASE 6 ORDER TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
