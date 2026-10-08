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

async function runApiE2ETests() {
  console.log("==================================================");
  console.log("PHASE 7 - FULL END-TO-END HTTP API VERIFICATION");
  console.log("==================================================");

  const token = await createSuperAdminToken();
  const headers = {
    "Content-Type": "application/json",
    Cookie: `admin_session=${token}`,
  };

  // TEST 1: GET /api/customers
  console.log("\n--- TEST 1: GET /api/customers ---");
  const customersRes = await fetch(`${BASE_URL}/api/customers?page=1&limit=10`, { headers });
  const customersData = await customersRes.json();
  console.log(`Status: ${customersRes.status}, Success: ${customersData.success}, Total: ${customersData.pagination?.total}`);
  if (!customersData.success || !Array.isArray(customersData.customers)) {
    throw new Error("GET /api/customers failed");
  }
  console.log("✓ Customer directory API verified.");

  // TEST 2: POST /api/customers (Create new customer)
  console.log("\n--- TEST 2: POST /api/customers (Create Customer) ---");
  const testEmail = `rohit.sharma.${Date.now()}@example.com`;
  const createCustRes = await fetch(`${BASE_URL}/api/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      firstName: "Rohit",
      lastName: "Sharma",
      email: testEmail,
      phone: "+91 98765 12345",
      tags: ["VIP", "Cricket-Fan"],
      marketingConsent: { email: true },
    }),
  });
  const createCustData = await createCustRes.json();
  console.log(`Status: ${createCustRes.status}, Created ID: ${createCustData.customer?._id}`);
  if (!createCustData.success || !createCustData.customer?._id) {
    throw new Error(`POST /api/customers failed: ${createCustData.error}`);
  }
  const customerId = createCustData.customer._id;
  console.log("✓ Customer profile creation verified.");

  // TEST 3: GET /api/customers/[id]
  console.log("\n--- TEST 3: GET /api/customers/[id] ---");
  const detailRes = await fetch(`${BASE_URL}/api/customers/${customerId}`, { headers });
  const detailData = await detailRes.json();
  console.log(`Status: ${detailRes.status}, Name: ${detailData.customer?.name}`);
  if (!detailData.success || detailData.customer?.email !== testEmail) {
    throw new Error("GET /api/customers/[id] failed");
  }
  console.log("✓ Customer detail API verified.");

  // TEST 4: PATCH /api/customers/[id] (Update Customer)
  console.log("\n--- TEST 4: PATCH /api/customers/[id] ---");
  const updateRes = await fetch(`${BASE_URL}/api/customers/${customerId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: "Rohit Gurunath",
      tags: ["VIP", "Captain"],
    }),
  });
  const updateData = await updateRes.json();
  if (!updateData.success || updateData.customer?.name !== "Rohit Gurunath") {
    throw new Error("PATCH /api/customers/[id] failed");
  }
  console.log("✓ Customer update verified.");

  // TEST 5: PATCH /api/customers/[id]/status (Status transition)
  console.log("\n--- TEST 5: PATCH /api/customers/[id]/status ---");
  const statusRes = await fetch(`${BASE_URL}/api/customers/${customerId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      status: "BLOCKED",
      reason: "Security audit testing",
    }),
  });
  const statusData = await statusRes.json();
  if (!statusData.success || statusData.customer?.status !== "BLOCKED") {
    throw new Error("PATCH /api/customers/[id]/status failed");
  }
  // Revert to ACTIVE
  await fetch(`${BASE_URL}/api/customers/${customerId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "ACTIVE", reason: "Reactivated" }),
  });
  console.log("✓ Customer status transition verified.");

  // TEST 6: POST /api/customers/[id]/notes
  console.log("\n--- TEST 6: POST /api/customers/[id]/notes ---");
  const noteRes = await fetch(`${BASE_URL}/api/customers/${customerId}/notes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ note: "Customer requested priority delivery on festive garments." }),
  });
  const noteData = await noteRes.json();
  if (!noteData.success || noteData.notes?.length !== 1) {
    throw new Error("POST /api/customers/[id]/notes failed");
  }
  console.log("✓ Customer internal notes API verified.");

  // TEST 7: POST /api/customers/[id]/addresses
  console.log("\n--- TEST 7: POST /api/customers/[id]/addresses ---");
  const addrRes = await fetch(`${BASE_URL}/api/customers/${customerId}/addresses`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Rohit Sharma",
      phone: "9876512345",
      addressLine1: "101 Marine Drive, Nariman Point",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400021",
      country: "India",
      type: "SHIPPING",
      isDefault: true,
    }),
  });
  const addrData = await addrRes.json();
  if (!addrData.success || addrData.addresses?.length !== 1) {
    throw new Error("POST /api/customers/[id]/addresses failed");
  }
  console.log("✓ Customer address API verified.");

  // TEST 8: GET /api/customers/[id]/orders
  console.log("\n--- TEST 8: GET /api/customers/[id]/orders ---");
  const custOrdersRes = await fetch(`${BASE_URL}/api/customers/${customerId}/orders`, { headers });
  const custOrdersData = await custOrdersRes.json();
  if (!custOrdersData.success || !Array.isArray(custOrdersData.orders)) {
    throw new Error("GET /api/customers/[id]/orders failed");
  }
  console.log(`Found ${custOrdersData.orders.length} orders for new customer.`);
  console.log("✓ Customer order history API verified.");

  // TEST 9: POST /api/segments (Create Dynamic & Manual Segments)
  console.log("\n--- TEST 9: POST /api/segments ---");
  const dynamicSegRes = await fetch(`${BASE_URL}/api/segments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `VIP Big Spenders ${Date.now()}`,
      description: "Customers who spent more than ₹1000",
      type: "RULE_BASED",
      matchType: "ALL",
      rules: [
        { field: "totalSpend", operator: "greater_than", value: 1000 },
      ],
    }),
  });
  const dynamicSegData = await dynamicSegRes.json();
  if (!dynamicSegData.success || !dynamicSegData.segment?._id) {
    throw new Error(`POST /api/segments failed: ${dynamicSegData.error}`);
  }
  const dynamicSegmentId = dynamicSegData.segment._id;
  console.log(`Created dynamic segment ID: ${dynamicSegmentId}, Member count: ${dynamicSegData.segment.memberCount}`);

  // Manual Segment
  const manualSegRes = await fetch(`${BASE_URL}/api/segments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: `Founders Circle ${Date.now()}`,
      description: "Handpicked customers",
      type: "MANUAL",
      customerIds: [customerId],
    }),
  });
  const manualSegData = await manualSegRes.json();
  if (!manualSegData.success || !manualSegData.segment?._id) {
    throw new Error(`POST /api/segments manual failed: ${manualSegData.error}`);
  }
  const manualSegmentId = manualSegData.segment._id;
  console.log(`Created manual segment ID: ${manualSegmentId}`);
  console.log("✓ Segments creation API verified.");

  // TEST 10: GET /api/segments
  console.log("\n--- TEST 10: GET /api/segments ---");
  const listSegRes = await fetch(`${BASE_URL}/api/segments`, { headers });
  const listSegData = await listSegRes.json();
  if (!listSegData.success || !Array.isArray(listSegData.segments)) {
    throw new Error("GET /api/segments failed");
  }
  console.log(`Total active segments: ${listSegData.segments.length}`);
  console.log("✓ Segments listing API verified.");

  // TEST 11: GET /api/segments/[id]
  console.log("\n--- TEST 11: GET /api/segments/[id] ---");
  const segDetailRes = await fetch(`${BASE_URL}/api/segments/${manualSegmentId}`, { headers });
  const segDetailData = await segDetailRes.json();
  if (!segDetailData.success || segDetailData.members?.length !== 1) {
    throw new Error("GET /api/segments/[id] failed");
  }
  console.log(`Manual segment members: ${segDetailData.members.length}`);
  console.log("✓ Segment detail API verified.");

  // TEST 12: POST /api/segments/[id]/members (Remove member)
  console.log("\n--- TEST 12: POST /api/segments/[id]/members (Remove) ---");
  const removeMemRes = await fetch(`${BASE_URL}/api/segments/${manualSegmentId}/members`, {
    method: "POST",
    headers,
    body: JSON.stringify({ customerId, action: "REMOVE" }),
  });
  const removeMemData = await removeMemRes.json();
  if (!removeMemData.success || removeMemData.memberCount !== 0) {
    throw new Error("POST /api/segments/[id]/members remove failed");
  }
  console.log("✓ Segment manual membership alteration verified.");

  // Clean segments
  await fetch(`${BASE_URL}/api/segments/${dynamicSegmentId}`, { method: "DELETE", headers });
  await fetch(`${BASE_URL}/api/segments/${manualSegmentId}`, { method: "DELETE", headers });

  // TEST 13: Reviews API (GET /api/reviews, POST /api/reviews)
  console.log("\n--- TEST 13: Reviews API (GET & POST) ---");
  const reviewsRes = await fetch(`${BASE_URL}/api/reviews`, { headers });
  const reviewsData = await reviewsRes.json();
  if (!reviewsData.success) {
    throw new Error("GET /api/reviews failed");
  }
  console.log(`Reviews count: ${reviewsData.reviews?.length}, avgRating: ${reviewsData.metrics?.averageRating}`);

  // Fetch a product for review
  const prodRes = await fetch(`${BASE_URL}/api/products?page=1&limit=1`, { headers });
  const prodData = await prodRes.json();
  const sampleProductId = prodData.data?.[0]?.id;

  if (sampleProductId) {
    const createReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: sampleProductId,
        customerId,
        customerName: "Rohit Gurunath",
        customerEmail: testEmail,
        rating: 5,
        title: "Superb craftsmanship",
        content: "Outstanding comfort and styling. Looked fantastic at the celebration.",
      }),
    });
    const createReviewData = await createReviewRes.json();
    if (!createReviewData.success || !createReviewData.review?._id) {
      throw new Error(`POST /api/reviews failed: ${createReviewData.error}`);
    }
    const reviewId = createReviewData.review._id;
    console.log(`Created review: ${reviewId}`);

    // TEST 14: GET /api/reviews/[id]
    console.log("\n--- TEST 14: GET /api/reviews/[id] ---");
    const revDetailRes = await fetch(`${BASE_URL}/api/reviews/${reviewId}`, { headers });
    const revDetailData = await revDetailRes.json();
    if (!revDetailData.success || revDetailData.review?.rating !== 5) {
      throw new Error("GET /api/reviews/[id] failed");
    }
    console.log("✓ Single review detail API verified.");

    // TEST 15: PATCH /api/reviews/[id]/moderate
    console.log("\n--- TEST 15: PATCH /api/reviews/[id]/moderate ---");
    const modRes = await fetch(`${BASE_URL}/api/reviews/${reviewId}/moderate`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "APPROVED", reason: "Verified genuine purchase" }),
    });
    const modData = await modRes.json();
    if (!modData.success || modData.review?.status !== "APPROVED") {
      throw new Error("PATCH /api/reviews/[id]/moderate failed");
    }
    console.log("✓ Review moderation API verified.");

    // TEST 16: POST /api/reviews/[id]/response
    console.log("\n--- TEST 16: POST /api/reviews/[id]/response ---");
    const respRes = await fetch(`${BASE_URL}/api/reviews/${reviewId}/response`, {
      method: "POST",
      headers,
      body: JSON.stringify({ response: "Thank you Rohit! We appreciate your support for Indian artisanal fashion." }),
    });
    const respData = await respRes.json();
    if (!respData.success || !respData.review?.adminResponse?.response) {
      throw new Error("POST /api/reviews/[id]/response failed");
    }
    console.log("✓ Review store response API verified.");

    // TEST 17: DELETE /api/reviews/[id]
    console.log("\n--- TEST 17: DELETE /api/reviews/[id] ---");
    const delRevRes = await fetch(`${BASE_URL}/api/reviews/${reviewId}`, { method: "DELETE", headers });
    const delRevData = await delRevRes.json();
    if (!delRevData.success) {
      throw new Error("DELETE /api/reviews/[id] failed");
    }
    console.log("✓ Review deletion API verified.");
  } else {
    throw new Error("No product found to test reviews API");
  }

  // Clean customer
  await fetch(`${BASE_URL}/api/customers/${customerId}`, { method: "DELETE", headers });
  console.log("✓ Test customer cleanup completed.");

  console.log("\n==================================================");
  console.log("🎉 ALL PHASE 7 HTTP API TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================\n");
  process.exit(0);
}

runApiE2ETests().catch((err) => {
  console.error("\n❌ API Test Failed:", err);
  process.exit(1);
});
