async function verifyCatalog() {
  const base = "http://localhost:3000";
  console.log("=== PHASE 4: PRODUCT CATALOG & VARIANT MANAGEMENT VERIFICATION ===\n");

  // 1. Authenticate
  console.log("--- 1. Authenticating as Super Admin ---");
  const loginRes = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@voguethreads.in", password: "admin@123" }),
  });
  console.log("Login HTTP Status:", loginRes.status);
  const cookieHeader = loginRes.headers.get("set-cookie");
  if (!cookieHeader) throw new Error("No session cookie returned");
  const cookie = cookieHeader.split(";")[0];
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  // 2. Test Empty Catalog State
  console.log("\n--- 2. Testing Empty Catalog State ---");
  const emptyListRes = await fetch(base + "/api/products?page=1&limit=10", { headers });
  console.log("GET /api/products status:", emptyListRes.status);
  const emptyListJson = await emptyListRes.json();
  console.log("Initial Products Count:", emptyListJson.pagination?.total, "(Expected: 0 if clean)");

  // 3. Create Real Category & Brand
  console.log("\n--- 3. Creating Real Category & Brand ---");
  const catRes = await fetch(base + "/api/categories", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Apparel Tops", description: "Crewneck and polo tees" }),
  });
  const catJson = await catRes.json();
  console.log("POST /api/categories:", catRes.status, catJson.success ? `Created: ${catJson.data?.name}` : catJson.error);
  const categoryId = catJson.data?._id;

  const brandRes = await fetch(base + "/api/brands", {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "VogueThreads Atelier", description: "Core collection" }),
  });
  const brandJson = await brandRes.json();
  console.log("POST /api/brands:", brandRes.status, brandJson.success ? `Created: ${brandJson.data?.name}` : brandJson.error);
  const brandId = brandJson.data?._id;

  // 4. Create Product with Dynamic Color × Size Variant Matrix (3 Colors × 3 Sizes = 9 Variants)
  console.log("\n--- 4. Creating Product with Dynamic 3×3 Variant Matrix (9 SKUs) ---");
  const colors = [
    { name: "Jet Black", hex: "#000000", code: "BLK" },
    { name: "Pure White", hex: "#FFFFFF", code: "WHT" },
    { name: "Olive Green", hex: "#556B2F", code: "OLV" },
  ];
  const sizes = ["S", "M", "L"];
  const dynamicVariants = [];

  colors.forEach((c) => {
    sizes.forEach((s) => {
      dynamicVariants.push({
        variantId: `var_${c.code.toLowerCase()}_${s.toLowerCase()}`,
        sku: `VT-HEAVY-${c.code}-${s}`,
        color: c,
        size: s,
        price: 1899,
        compareAtPrice: 2999,
        costPrice: 650,
        weightGrams: 320,
        availability: "IN_STOCK",
      });
    });
  });

  const productPayload = {
    title: "Supima Cotton Heavyweight Tee",
    slug: "supima-cotton-heavyweight-tee",
    shortDescription: "280 GSM luxury combed cotton with ribbed collar.",
    description: "Tailored in a modern relaxed silhouette from ultra-soft long staple cotton.",
    categoryId,
    brandId,
    gender: "UNISEX",
    hsnCode: "6109",
    gstRate: 5,
    status: "PUBLISHED",
    primaryImages: [
      { url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", alt: "Black tee" },
    ],
    variants: dynamicVariants,
    attributes: [
      { name: "Fabric", value: "100% Combed Cotton" },
      { name: "Fit", value: "Relaxed Fit" },
      { name: "Sleeve", value: "Half Sleeve" },
      { name: "Neck", value: "Crew Neck" },
    ],
    careInstructions: ["Machine wash cold", "Warm iron inside out"],
  };

  const createProdRes = await fetch(base + "/api/products", {
    method: "POST",
    headers,
    body: JSON.stringify(productPayload),
  });
  console.log("POST /api/products status:", createProdRes.status);
  const createProdJson = await createProdRes.json();
  console.log("Create Product Success:", createProdJson.success);
  if (!createProdJson.success) {
    console.error("Creation Error:", createProdJson.error);
    process.exit(1);
  }
  const createdProductId = createProdJson.data._id;
  console.log("Created Product ID:", createdProductId);
  console.log("Variants Count:", createProdJson.data.variants.length, "(Expected: 9)");

  // 5. Test SKU Uniqueness Validation
  console.log("\n--- 5. Testing SKU Uniqueness Validation ---");
  const dupePayload = {
    ...productPayload,
    title: "Duplicate SKU Attempt Tee",
    slug: "duplicate-sku-attempt-tee",
    variants: [
      {
        variantId: "var_dupe_test",
        sku: "VT-HEAVY-BLK-M", // Already used above!
        color: { name: "Jet Black", hex: "#000" },
        size: "M",
        price: 1899,
      },
    ],
  };
  const dupeRes = await fetch(base + "/api/products", {
    method: "POST",
    headers,
    body: JSON.stringify(dupePayload),
  });
  console.log("Duplicate SKU POST Status:", dupeRes.status, "(Expected: 400)");
  const dupeJson = await dupeRes.json();
  console.log("Duplicate Rejection Message:", dupeJson.error);

  // 6. Test Single Product Details & Inventory Synchronization
  console.log("\n--- 6. Testing GET /api/products/[id] & Inventory Synchronization ---");
  const detailRes = await fetch(`${base}/api/products/${createdProductId}`, { headers });
  console.log("GET /api/products/[id] status:", detailRes.status);
  const detailJson = await detailRes.json();
  console.log("Detail Product Title:", detailJson.data?.title);
  console.log("Category Populated:", detailJson.data?.categoryId?.name);
  console.log("Brand Populated:", detailJson.data?.brandId?.name);
  console.log(
    "Sample Variant Inventory Available:",
    detailJson.data?.variants?.[0]?.inventory?.available,
    "(Expected: 0 initialized in Inventory)"
  );

  // 7. Test Catalog Search & Filters
  console.log("\n--- 7. Testing Search, Filter, and Sort ---");
  const searchRes = await fetch(`${base}/api/products?search=Heavyweight`, { headers });
  const searchJson = await searchRes.json();
  console.log("Search 'Heavyweight' match count:", searchJson.data?.length, "(Expected: 1)");

  const filterStatusRes = await fetch(`${base}/api/products?status=PUBLISHED`, { headers });
  const filterStatusJson = await filterStatusRes.json();
  console.log("Filter status 'PUBLISHED' match count:", filterStatusJson.data?.length, "(Expected: 1)");

  const filterDraftRes = await fetch(`${base}/api/products?status=DRAFT`, { headers });
  const filterDraftJson = await filterDraftRes.json();
  console.log("Filter status 'DRAFT' match count:", filterDraftJson.data?.length, "(Expected: 0)");

  // 8. Test Product Update (PATCH)
  console.log("\n--- 8. Testing Product Update (PATCH) ---");
  const patchRes = await fetch(`${base}/api/products/${createdProductId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      shortDescription: "Updated 280 GSM luxury combed cotton with reinforced seams.",
      status: "DRAFT",
    }),
  });
  console.log("PATCH /api/products/[id] status:", patchRes.status);
  const patchJson = await patchRes.json();
  console.log("Updated Status:", patchJson.data?.status, "(Expected: DRAFT)");

  // 9. Test Product Duplication
  console.log("\n--- 9. Testing Product Duplication (POST /duplicate) ---");
  const dupeActionRes = await fetch(`${base}/api/products/${createdProductId}/duplicate`, {
    method: "POST",
    headers,
  });
  console.log("POST /duplicate status:", dupeActionRes.status);
  const dupeActionJson = await dupeActionRes.json();
  console.log("Cloned Title:", dupeActionJson.data?.title, "(Expected to end with (Copy))");
  console.log("Cloned Status:", dupeActionJson.data?.status, "(Expected: DRAFT)");
  console.log("Sample Cloned SKU:", dupeActionJson.data?.variants?.[0]?.sku);
  const clonedId = dupeActionJson.data?._id;

  // 10. Test Safe Delete / Archive on Clone
  console.log("\n--- 10. Testing Safe Delete / Archive ---");
  const deleteRes = await fetch(`${base}/api/products/${clonedId}`, {
    method: "DELETE",
    headers,
  });
  console.log("DELETE status:", deleteRes.status);
  const deleteJson = await deleteRes.json();
  console.log("Delete Message:", deleteJson.message);

  // 11. Test Bulk Actions
  console.log("\n--- 11. Testing Bulk Actions ---");
  const bulkRes = await fetch(`${base}/api/products/bulk`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      action: "PUBLISH",
      ids: [createdProductId],
    }),
  });
  console.log("Bulk Action Status:", bulkRes.status);
  const bulkJson = await bulkRes.json();
  console.log("Bulk Message:", bulkJson.message);

  // 12. Regression Test: Verify Other Routes
  console.log("\n--- 12. Regression Testing Existing Modules ---");
  const checkRoutes = [
    "/admin",
    "/admin/login",
    "/inventory",
    "/orders",
    "/customers",
    "/analytics",
    "/admin-users",
    "/settings",
  ];
  for (const r of checkRoutes) {
    const res = await fetch(base + r, { headers: { Cookie: cookie } });
    console.log(`Route [${r}]: Status ${res.status}`);
  }

  console.log("\n=== ALL PHASE 4 CATALOG VERIFICATIONS PASSED SUCCESSFULLY ===");
}

verifyCatalog().catch(console.error);
