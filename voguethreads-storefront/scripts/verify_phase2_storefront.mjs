async function verify() {
  const base = "http://localhost:3001";
  const routes = [
    { name: "Homepage", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "Shop Filtered", path: "/shop?category=t-shirts&sort=price-asc" },
    { name: "Category Page", path: "/category/t-shirts" },
    { name: "Collection Page", path: "/collection/summer-monochrome" },
    { name: "Brand Page", path: "/brand/voguethreads-atelier" },
    { name: "Product Detail Page", path: "/product/supima-cotton-heavyweight-boxy-tee" },
    { name: "Search Page", path: "/search?q=tee" },
    { name: "Search Autocomplete API", path: "/api/search/suggestions?q=cotton" },
    { name: "Wishlist", path: "/wishlist" },
    { name: "Cart", path: "/cart" },
    { name: "Sale", path: "/sale" },
  ];

  console.log("=== PHASE 2: DISCOVERY LAYER HTTP VERIFICATION ===\n");
  let passed = 0;

  for (const r of routes) {
    try {
      const res = await fetch(`${base}${r.path}`);
      const text = await res.text();
      const status = res.status;
      const ok = status === 200;
      console.log(`${ok ? "✅" : "❌"} [${status}] ${r.name.padEnd(26)} -> ${r.path} (${text.length} bytes)`);
      if (ok) passed++;
      if (r.path.includes("suggestions")) {
        console.log("   Suggestion Response:", text.slice(0, 120) + "...");
      }
    } catch (err) {
      console.error(`❌ [ERR] ${r.name}:`, err.message);
    }
  }

  console.log(`\nVerification Complete: ${passed}/${routes.length} routes passed!`);
  if (passed === routes.length) {
    console.log("🎉 ALL PHASE 2 DISCOVERY ROUTES VERIFIED HEALTHY!");
  } else {
    process.exit(1);
  }
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
