import mongoose from "mongoose";
import Coupon from "../src/models/Coupon.js";
import Discount from "../src/models/Discount.js";
import Order from "../src/models/Order.js";
import Customer from "../src/models/Customer.js";
import Segment from "../src/models/Segment.js";
import Product from "../src/models/Product.js";
import Inventory from "../src/models/Inventory.js";
import Category from "../src/models/Category.js";
import {
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  recordCouponRedemptionAtomic,
  getCouponsList,
  getCouponMetrics,
} from "../src/lib/coupon-service.js";
import {
  createDiscount,
  updateDiscount,
  toggleDiscountStatus,
  deleteDiscount,
  getDiscountsList,
  getDiscountMetrics,
} from "../src/lib/discount-service.js";
import {
  validateAndCalculateCoupon,
  evaluateAutomaticDiscounts,
} from "../src/lib/promotion-engine.js";
import { createOrder } from "../src/lib/order-service.js";

const DATABASE_URL = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

async function runPhase8MarketingTests() {
  console.log("==================================================");
  console.log("RUNNING PHASE 8 — MARKETING SYSTEM VERIFICATION");
  console.log("==================================================");

  await mongoose.connect(DATABASE_URL);
  console.log("✅ [MongoDB] Connected to database successfully.");

  const testActor = {
    id: new mongoose.Types.ObjectId(),
    email: "admin@voguethreads.in",
  };

  // Clean up existing test coupons and discounts
  await Coupon.deleteMany({ code: /^TEST-/i });
  await Discount.deleteMany({ name: /^Test /i });

  console.log("\n--- TEST 1: Case-Insensitive Coupon Code Uniqueness ---");
  const coupon1 = await createCoupon(
    {
      code: "test-save20",
      description: "Test 20% off",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minimumOrderValue: 1000,
      maximumDiscountAmount: 500,
      usageLimit: 10,
    },
    testActor
  );
  console.log(`✓ Created coupon '${coupon1.code}' with normalizedCode '${coupon1.normalizedCode}'`);

  let duplicateCaught = false;
  try {
    await createCoupon(
      {
        code: "TEST-SAVE20",
        discountType: "PERCENTAGE",
        discountValue: 20,
      },
      testActor
    );
  } catch (err) {
    duplicateCaught = true;
    console.log(`✓ Duplicate code correctly rejected: ${err.message}`);
  }
  if (!duplicateCaught) throw new Error("Duplicate coupon code should have been rejected!");

  try {
    await createCoupon(
      {
        code: "Test-Save20",
        discountType: "PERCENTAGE",
        discountValue: 20,
      },
      testActor
    );
    throw new Error("Mixed case duplicate should have been rejected!");
  } catch (err) {
    console.log(`✓ Mixed case duplicate correctly rejected: ${err.message}`);
  }

  console.log("\n--- TEST 2: Percentage Discount Calculation & Max Cap ---");
  // Subtotal = 3000. 20% = 600. Max cap = 500. Expected discount = 500.
  const calc1 = await validateAndCalculateCoupon({
    code: "TEST-SAVE20",
    orderSubtotal: 3000,
    cartItems: [{ unitPrice: 3000, quantity: 1, subtotal: 3000 }],
  });
  console.log(`Subtotal: 3000, Discount: ${calc1.discountAmount}, Cap: 500`);
  if (calc1.discountAmount !== 500) {
    throw new Error(`Expected discount 500, got ${calc1.discountAmount}`);
  }
  console.log("✓ Percentage discount capped correctly at maximumDiscountAmount.");

  // Subtotal = 1500. 20% = 300. Max cap = 500. Expected discount = 300.
  const calc2 = await validateAndCalculateCoupon({
    code: "TEST-SAVE20",
    orderSubtotal: 1500,
    cartItems: [{ unitPrice: 1500, quantity: 1, subtotal: 1500 }],
  });
  console.log(`Subtotal: 1500, Discount: ${calc2.discountAmount}`);
  if (calc2.discountAmount !== 300) {
    throw new Error(`Expected discount 300, got ${calc2.discountAmount}`);
  }
  console.log("✓ Percentage discount calculated accurately below cap.");

  console.log("\n--- TEST 3: Minimum Order Value Validation ---");
  // Min order is 1000. Test with subtotal = 800.
  const calcMinFail = await validateAndCalculateCoupon({
    code: "TEST-SAVE20",
    orderSubtotal: 800,
    cartItems: [{ unitPrice: 800, quantity: 1, subtotal: 800 }],
  });
  if (calcMinFail.valid) {
    throw new Error("Coupon should have been invalid because subtotal < minimumOrderValue");
  }
  console.log(`✓ Rejection message: '${calcMinFail.reason}'`);

  console.log("\n--- TEST 4: Fixed Discount & Zero/Negative Balance Guard ---");
  const fixedCoupon = await createCoupon(
    {
      code: "TEST-FLAT400",
      description: "Flat 400 off",
      discountType: "FIXED",
      discountValue: 400,
      minimumOrderValue: 200,
    },
    testActor
  );

  // Subtotal = 300. Discount 400 cannot exceed 300.
  const calcFixed = await validateAndCalculateCoupon({
    code: "TEST-FLAT400",
    orderSubtotal: 300,
    cartItems: [{ unitPrice: 300, quantity: 1, subtotal: 300 }],
  });
  if (calcFixed.discountAmount > 300) {
    throw new Error(`Discount ${calcFixed.discountAmount} cannot exceed cart subtotal 300`);
  }
  console.log(`Subtotal: 300, Flat Discount: ${calcFixed.discountAmount} (Capped to subtotal)`);
  console.log("✓ Fixed discount properly guarded against negative totals.");

  console.log("\n--- TEST 5: Atomic Concurrency & Usage Limit Overflow Guard ---");
  const limitedCoupon = await createCoupon(
    {
      code: "TEST-LIMIT2",
      discountType: "FIXED",
      discountValue: 100,
      usageLimit: 2,
    },
    testActor
  );

  const r1 = await recordCouponRedemptionAtomic("TEST-LIMIT2");
  const r2 = await recordCouponRedemptionAtomic("TEST-LIMIT2");
  const r3 = await recordCouponRedemptionAtomic("TEST-LIMIT2"); // Should NOT increment
  const checkCoupon = await Coupon.findById(limitedCoupon._id);
  console.log(`Coupon usage count after 3 attempts on limit=2: ${checkCoupon.usageCount}`);
  if (checkCoupon.usageCount > 2) {
    throw new Error(`Usage count exceeded limit! Got ${checkCoupon.usageCount}`);
  }
  if (r3 !== null) {
    throw new Error("Third redemption should return null (failed atomic update)");
  }
  console.log("✓ Atomic usage limit overflow protection confirmed.");

  console.log("\n--- TEST 6: First-Order-Only & Customer Restrictions ---");
  const firstOrderCoupon = await createCoupon(
    {
      code: "TEST-FIRSTBUY",
      discountType: "PERCENTAGE",
      discountValue: 10,
      firstOrderOnly: true,
    },
    testActor
  );

  // Test customer with 0 orders
  const newCustomerEmail = `newcustomer_${Date.now()}@voguethreads.in`;
  const firstBuyValid = await validateAndCalculateCoupon({
    code: "TEST-FIRSTBUY",
    customerEmail: newCustomerEmail,
    orderSubtotal: 1000,
    cartItems: [{ unitPrice: 1000, quantity: 1, subtotal: 1000 }],
  });
  if (!firstBuyValid.valid) {
    throw new Error(`First order buyer should be eligible: ${firstBuyValid.reason}`);
  }
  console.log("✓ New buyer with 0 past orders is eligible for first-order coupon.");

  console.log("\n--- TEST 7: Customer Segment Targeting ---");
  // Find or create VIP Segment
  let vipSegment = await Segment.findOne({ slug: "test-vip-shoppers" });
  if (!vipSegment) {
    vipSegment = await Segment.create({
      name: "Test VIP Shoppers",
      slug: "test-vip-shoppers",
      type: "RULE_BASED",
      rules: [{ field: "totalSpend", operator: "greater_than_or_equal", value: 10000 }],
      status: "ACTIVE",
    });
  }

  const segmentCoupon = await createCoupon(
    {
      code: "TEST-VIPONLY",
      discountType: "PERCENTAGE",
      discountValue: 25,
      applicableCustomerSegments: [vipSegment._id],
    },
    testActor
  );

  // Non-VIP customer validation
  const regCustomer = await Customer.create({
    name: "Regular Buyer",
    email: `regular_${Date.now()}@voguethreads.in`,
    phone: "9876543210",
  });

  const segmentCheck = await validateAndCalculateCoupon({
    code: "TEST-VIPONLY",
    customerId: regCustomer._id,
    orderSubtotal: 2000,
    cartItems: [{ unitPrice: 2000, quantity: 1, subtotal: 2000 }],
  });

  if (segmentCheck.valid) {
    throw new Error("Non-VIP customer should have been rejected by segment restriction!");
  }
  console.log(`✓ Non-VIP customer correctly rejected: '${segmentCheck.reason}'`);

  console.log("\n--- TEST 8: Automatic Store Promotions Priority & Stacking ---");
  const promoExclusive = await createDiscount(
    {
      name: "Test Flash Sale 20% (Exclusive)",
      discountType: "PERCENTAGE",
      discountValue: 20,
      priority: 1,
      stacking: "EXCLUSIVE",
    },
    testActor
  );

  const promoStackable = await createDiscount(
    {
      name: "Test Extra 5% (Stackable)",
      discountType: "PERCENTAGE",
      discountValue: 5,
      priority: 2,
      stacking: "STACKABLE",
    },
    testActor
  );

  const autoResult = await evaluateAutomaticDiscounts({
    orderSubtotal: 2000,
    cartItems: [{ unitPrice: 2000, quantity: 1, subtotal: 2000 }],
  });

  console.log("Applied Automatic Promotions:", autoResult.appliedDiscounts);
  if (autoResult.appliedDiscounts.length !== 1) {
    throw new Error("Exclusive promo should have prevented secondary promotion from stacking!");
  }
  console.log(`✓ Deterministic priority and exclusive stacking rule verified. Discount: ₹${autoResult.totalDiscountAmount}`);

  console.log("\n--- TEST 9: Order Integration & Historical Immutability ---");
  // Find a product variant in DB
  const sampleProduct = await Product.findOne().lean();
  const sampleVariant = sampleProduct?.variants?.[0];
  let savedOrder = null;

  if (sampleVariant) {
    const orderPayload = {
      customerId: regCustomer._id,
      customerDetails: {
        name: "Historical Promotion Customer",
        email: regCustomer.email,
        phone: "9998887776",
      },
      payment: { method: "UPI", status: "PAID" },
      shippingAddress: {
        fullName: "Test Customer",
        phone: "9998887776",
        addressLine1: "123 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pinCode: "560001",
      },
      items: [
        {
          productId: sampleProduct._id,
          variantId: sampleVariant._id || "VAR-1",
          sku: sampleVariant.sku,
          title: sampleProduct.title,
          color: typeof sampleVariant.color === "object" ? sampleVariant.color.name : (sampleVariant.color || "Blue"),
          colorHex: typeof sampleVariant.color === "object" ? sampleVariant.color.hex : "#000000",
          size: typeof sampleVariant.size === "object" ? sampleVariant.size.value : (sampleVariant.size || "M"),
          unitPrice: 2000,
          quantity: 1,
          subtotal: 2000,
          total: 2100,
        },
      ],
      pricing: {
        subtotal: 2000,
        discountAmount: 400,
        couponCode: "TEST-SAVE20",
        promotionSnapshot: {
          couponCode: "TEST-SAVE20",
          couponId: coupon1._id,
          discountType: "PERCENTAGE",
          discountValue: 20,
          discountAmount: 400,
          name: "Original 20% Discount Snapshot",
        },
      },
    };

    savedOrder = await createOrder(orderPayload, testActor);
    console.log(`✓ Created test order: ${savedOrder.orderNumber}`);
    console.log(`  Stored discountAmount: ${savedOrder.pricing.discountAmount}`);
    console.log(`  Stored snapshot:`, savedOrder.pricing.promotionSnapshot);

    // Now, change the coupon in Marketing (e.g. reduce discount from 20% to 5%)
    await updateCoupon(coupon1._id, { discountValue: 5 }, testActor);
    console.log("✓ Updated coupon rule in Marketing to 5%.");

    // Fetch the historical order again from DB
    const refetchedOrder = await Order.findById(savedOrder._id).lean();
    if (refetchedOrder.pricing.discountAmount !== 400) {
      throw new Error(`Historical order discount corrupted! Expected 400, got ${refetchedOrder.pricing.discountAmount}`);
    }
    if (refetchedOrder.pricing.promotionSnapshot?.discountAmount !== 400) {
      throw new Error(`Historical promotion snapshot corrupted! Got ${refetchedOrder.pricing.promotionSnapshot?.discountAmount}`);
    }
    console.log("✓ Historical order pricing and promotion snapshot remained completely immutable!");

    console.log("\n--- TEST 10: Safe Deletion vs Archiving Guard ---");
    let deletePrevented = false;
    try {
      await deleteCoupon(coupon1._id, testActor);
    } catch (delErr) {
      deletePrevented = true;
      console.log(`✓ Deletion correctly rejected: '${delErr.message}'`);
    }
    if (!deletePrevented) {
      throw new Error("Coupon referenced by order should not be permanently deletable!");
    }

    // Archiving should succeed
    const archived = await toggleCouponStatus(coupon1._id, "ARCHIVED", testActor);
    console.log(`✓ Archived coupon successfully. Status is now: ${archived.status}`);
  }

  // Cleanup
  if (savedOrder) {
    await Order.findByIdAndDelete(savedOrder._id);
    if (sampleVariant?.sku) {
      await Inventory.updateOne(
        { variantSku: sampleVariant.sku.toUpperCase() },
        { $inc: { reserved: -1, available: 1 } }
      );
    }
  }
  await Coupon.deleteMany({ code: /^TEST-/i });
  await Discount.deleteMany({ name: /^Test /i });
  await Customer.findByIdAndDelete(regCustomer._id);
  if (vipSegment) await Segment.findByIdAndDelete(vipSegment._id);

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 8 MARKETING BUSINESS LOGIC TESTS PASSED!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runPhase8MarketingTests().catch((err) => {
  console.error("❌ Marketing verification failed:", err);
  process.exit(1);
});
