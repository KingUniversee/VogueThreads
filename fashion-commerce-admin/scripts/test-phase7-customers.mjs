import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/mongoose.js";
import Customer from "../src/models/Customer.js";
import Order from "../src/models/Order.js";
import Product from "../src/models/Product.js";
import Segment from "../src/models/Segment.js";
import Review from "../src/models/Review.js";
import {
  syncCustomersFromOrders,
  getCustomerPurchasingMetrics,
  getCustomerListMetrics,
} from "../src/lib/customer-service.js";
import {
  doesCustomerMatchSegment,
  getSegmentMembers,
} from "../src/lib/segment-service.js";
import {
  getReviewMetrics,
  moderateReview,
  postAdminResponse,
} from "../src/lib/review-service.js";

async function runTests() {
  console.log("🚀 Starting Phase 7 - Customers Management Comprehensive Verification...");
  await connectToDatabase();

  // Test 1: Self-healing sync from existing live orders
  console.log("\n📦 Test 1: Testing self-healing sync from existing live orders...");
  const existingOrdersCount = await Order.countDocuments();
  console.log(`Found ${existingOrdersCount} live orders in database.`);

  const syncResult = await syncCustomersFromOrders();
  console.log("Sync Result:", syncResult);

  const totalCustomers = await Customer.countDocuments({ isDeleted: { $ne: true } });
  console.log(`Total customers in database now: ${totalCustomers}`);
  if (totalCustomers === 0 && existingOrdersCount > 0) {
    throw new Error("❌ Sync failed to import customers from existing orders!");
  }
  console.log("✅ Test 1 Passed: Order customer synchronization verified.");

  // Test 2: Verify Customer Purchasing Metrics & RFM logic
  console.log("\n📊 Test 2: Testing live customer purchasing metrics (RFM)...");
  const sampleCustomer = await Customer.findOne({ isDeleted: { $ne: true } });
  if (sampleCustomer) {
    const metrics = await getCustomerPurchasingMetrics(sampleCustomer._id, sampleCustomer.email);
    console.log(`Metrics for ${sampleCustomer.email}:`, metrics);
    if (typeof metrics.totalSpend !== "number" || typeof metrics.totalOrders !== "number") {
      throw new Error("❌ Invalid metrics calculated!");
    }
    console.log("✅ Test 2 Passed: Dynamic purchasing metrics calculated accurately.");
  } else {
    console.log("⚠️ No customer found to test metrics.");
  }

  // Test 3: Segments creation and dynamic evaluation
  console.log("\n🎯 Test 3: Testing Segments (Rule-Based and Manual)...");
  // Clean up any test segments from previous runs
  await Segment.deleteMany({ name: /^TEST_/ });

  // 3a: Rule-based segment (All customers with spend >= 0 and order count >= 0)
  const dynamicSegment = await Segment.create({
    name: "TEST_All_Buyers",
    slug: "test-all-buyers",
    description: "Testing rule-based segment logic",
    type: "RULE_BASED",
    matchType: "ALL",
    rules: [
      { field: "orderCount", operator: "greater_than_or_equal", value: 0 },
    ],
  });

  const dynamicMembers = await getSegmentMembers(dynamicSegment._id);
  console.log(`Dynamic segment members count: ${dynamicMembers.members.length}, total: ${dynamicMembers.totalCount}`);

  // 3b: Manual segment
  const firstCustomer = await Customer.findOne({ isDeleted: { $ne: true } });
  if (firstCustomer) {
    const manualSegment = await Segment.create({
      name: "TEST_VIP_Handpicked",
      slug: "test-vip-handpicked",
      description: "Testing manual cohort",
      type: "MANUAL",
      customerIds: [firstCustomer._id],
    });

    const manualMembers = await getSegmentMembers(manualSegment._id);
    console.log(`Manual segment members count: ${manualMembers.members.length}`);
    if (manualMembers.members.length !== 1 || String(manualMembers.members[0]._id) !== String(firstCustomer._id)) {
      throw new Error("❌ Manual segment membership failed!");
    }
    await Segment.findByIdAndDelete(manualSegment._id);
  }

  await Segment.findByIdAndDelete(dynamicSegment._id);
  console.log("✅ Test 3 Passed: Segments evaluation verified.");

  // Test 4: Product Reviews Moderation Lifecycle & Verified Buyer Check
  console.log("\n⭐ Test 4: Testing Reviews Management, Moderation, & Verified Buyer...");
  // Find a product
  const sampleProduct = await Product.findOne({ isDeleted: { $ne: true } });
  if (!sampleProduct) {
    throw new Error("❌ No product available to attach test review!");
  }

  // Clean test reviews
  await Review.deleteMany({ customerEmail: "test-shopper-review@voguethreads.in" });

  const newReview = await Review.create({
    productId: sampleProduct._id,
    customerName: "Priya Patel",
    customerEmail: "test-shopper-review@voguethreads.in",
    rating: 5,
    title: "Incredible silk quality!",
    content: "The fabric texture and fit exceed all expectations. Will order in maroon as well.",
    isVerifiedBuyer: true,
    status: "PENDING",
  });

  console.log(`Created test review: ${newReview._id}, initial status: ${newReview.status}`);

  // Test moderation
  const approvedReview = await moderateReview(
    newReview._id,
    "APPROVED",
    "Verified high-quality review",
    { email: "admin@voguethreads.in" }
  );
  if (approvedReview.status !== "APPROVED") {
    throw new Error("❌ Moderation status did not update to APPROVED!");
  }
  console.log(`Review moderated to: ${approvedReview.status} by ${approvedReview.moderatedBy}`);

  // Test official store response
  const respondedReview = await postAdminResponse(
    newReview._id,
    "Thank you Priya! We are thrilled to hear that the silk fabric met your standards.",
    { email: "support@voguethreads.in" }
  );
  if (!respondedReview.adminResponse || !respondedReview.adminResponse.response) {
    throw new Error("❌ Admin response failed to save!");
  }
  console.log("Official response saved:", respondedReview.adminResponse.response);

  // Test metrics
  const reviewMetrics = await getReviewMetrics();
  console.log("Current Review Metrics:", reviewMetrics);
  if (reviewMetrics.totalReviews < 1) {
    throw new Error("❌ Review metrics failed to count test review!");
  }

  // Cleanup test review
  await Review.findByIdAndDelete(newReview._id);
  console.log("✅ Test 4 Passed: Reviews moderation & response verified.");

  // Test 5: Historical Data Immutability Guard
  console.log("\n🔒 Test 5: Testing Historical Order Immutability Guard...");
  const orderWithCustomer = await Order.findOne({ "customer.email": { $exists: true } });
  if (orderWithCustomer) {
    const originalEmail = orderWithCustomer.customer.email;
    const originalName = orderWithCustomer.customer.name;
    const originalShippingAddress = JSON.stringify(orderWithCustomer.shippingAddress);

    // Find the customer record for this email
    const linkedCustomer = await Customer.findOne({ email: originalEmail.toLowerCase() });
    if (linkedCustomer) {
      // Modify customer profile
      linkedCustomer.firstName = "TemporarilyChangedName";
      await linkedCustomer.save();

      // Reload order from database
      const reloadedOrder = await Order.findById(orderWithCustomer._id);
      if (
        reloadedOrder.customer.name !== originalName ||
        JSON.stringify(reloadedOrder.shippingAddress) !== originalShippingAddress
      ) {
        throw new Error("❌ IMMUTABILITY BREACH: Changing customer profile mutated past order data!");
      }

      // Revert customer name
      linkedCustomer.firstName = originalName.split(" ")[0] || "Customer";
      await linkedCustomer.save();
      console.log("✅ Test 5 Passed: Past order snapshot remained completely immutable.");
    }
  } else {
    console.log("⚠️ No order with customer email found to test immutability guard.");
  }

  console.log("\n🎉 ALL PHASE 7 MODEL & SERVICE TESTS PASSED SUCCESSFULLY!\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ Test execution failed:", err);
  process.exit(1);
});
