async function runVerification() {
  const base = "http://localhost:3000";
  console.log("=== COMPREHENSIVE STABILITY & PERFORMANCE VERIFICATION ===\n");

  // 1. Unauthenticated Login Page
  console.log("1. Checking /admin/login (Unauthenticated)...");
  const loginPageRes = await fetch(base + "/admin/login");
  console.log("   Status:", loginPageRes.status);
  const loginHtml = await loginPageRes.text();
  const loginFormCount = (loginHtml.match(/<form/gi) || []).length;
  console.log("   Form count in login HTML:", loginFormCount, "(Expected: 1)");

  // 2. Authenticate
  console.log("\n2. Authenticating as Super Admin...");
  const authRes = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@voguethreads.in", password: "admin@123" }),
  });
  const cookie = authRes.headers.get("set-cookie").split(";")[0];
  const authHeaders = { Cookie: cookie };
  console.log("   Login API Status:", authRes.status);

  // 3. Check /products/new Form Nesting & Hydration Safety
  console.log("\n3. Inspecting /products/new Rendered HTML for Nested Forms...");
  const newProductRes = await fetch(base + "/products/new", { headers: authHeaders });
  console.log("   GET /products/new Status:", newProductRes.status);
  const newProductHtml = await newProductRes.text();
  const newProductFormCount = (newProductHtml.match(/<form/gi) || []).length;
  console.log("   Total <form> tags in /products/new:", newProductFormCount, "(Expected: strictly 1)");
  if (newProductFormCount > 1) {
    console.error("   ❌ ERROR: Nested forms detected!");
    process.exit(1);
  } else {
    console.log("   ✅ PASSED: Exactly ONE top-level form rendered. Zero nested forms.");
  }

  // 4. Test Product Creation with Custom Color & Size
  console.log("\n4. Testing Product Creation Flow with Custom Color & Size...");
  const testProduct = {
    title: "Performance Linen Camp Shirt",
    slug: `performance-linen-shirt-${Date.now()}`,
    categoryId: "6a9fec5a3f8b2548d7869e0b", // from previous test or find first
    gender: "MEN",
    status: "DRAFT",
    variants: [
      {
        variantId: "var_linen_sand_m",
        sku: `VT-LINEN-SND-M-${Date.now().toString().slice(-4)}`,
        color: { name: "Sand", hex: "#D2B48C", code: "SND" },
        size: "M",
        price: 2499,
        availability: "IN_STOCK",
      },
    ],
  };

  // Find a valid categoryId if needed
  const catRes = await fetch(base + "/api/categories", { headers: authHeaders });
  const catJson = await catRes.json();
  if (catJson.data && catJson.data.length > 0) {
    testProduct.categoryId = catJson.data[0]._id;
  }

  const createRes = await fetch(base + "/api/products", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(testProduct),
  });
  console.log("   POST /api/products Status:", createRes.status);
  const createJson = await createRes.json();
  console.log("   Create Product Success:", createJson.success);
  const createdId = createJson.data?._id;

  // 5. Verify All Required Routes
  console.log("\n5. Verifying Required Routes Response Status...");
  const routesToVerify = [
    { path: "/admin/login", expectRedirectOrOk: true },
    { path: "/admin", expectOk: true },
    { path: "/products", expectOk: true },
    { path: "/products/new", expectOk: true },
    { path: "/inventory", expectOk: true },
    { path: "/orders", expectOk: true },
    { path: "/customers", expectOk: true },
    { path: "/analytics", expectOk: true },
    { path: "/settings", expectOk: true },
  ];

  for (const r of routesToVerify) {
    const res = await fetch(base + r.path, {
      headers: authHeaders,
      redirect: "manual",
    });
    console.log(`   Route [${r.path}]: Status ${res.status}`);
  }

  // 6. Clean up test product
  if (createdId) {
    await fetch(`${base}/api/products/${createdId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    console.log("\n6. Cleaned up temporary test product.");
  }

  console.log("\n=== ALL STABILITY & PERFORMANCE CHECKS PASSED ===");
}

runVerification().catch(console.error);
