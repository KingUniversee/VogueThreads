import mongoose from "mongoose";
import {
  Product,
  Category,
  Brand,
  Collection,
  Review,
  Inventory,
  Discount,
  Setting,
} from "../src/models/index.js";

const DATABASE_URL =
  process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/fashion_commerce_admin";

async function seed() {
  console.log("🌱 [Catalog Seed] Connecting to MongoDB:", DATABASE_URL);
  await mongoose.connect(DATABASE_URL);

  console.log("🌱 [Catalog Seed] Synchronizing store settings...");
  await Setting.findOneAndUpdate(
    {},
    {
      "store.name": "VogueThreads",
      "store.legalEntity": "VogueThreads Fashion Retail Pvt. Ltd.",
      "store.email": "concierge@voguethreads.in",
      "store.phone": "+91 98765 43210",
      "store.currency": "INR",
      "tax.gstin": "27AAAAA0000A1Z5",
      "tax.registeredState": "Maharashtra",
      "tax.registeredStateCode": "27",
      "tax.defaultHsnCode": "6109",
      "tax.defaultGstRate": 5,
      "shipping.defaultCourier": "DELHIVERY",
      "shipping.freeShippingThreshold": 999,
      "shipping.standardShippingFee": 49,
      "shipping.estimatedDeliveryDays": "3-5 Business Days",
      "shipping.returnWindowDays": 7,
      "payments.codEnabled": true,
      "payments.razorpayEnabled": true,
    },
    { upsert: true, new: true }
  );

  console.log("🌱 [Catalog Seed] Synchronizing categories...");
  const categoriesData = [
    {
      name: "T-Shirts",
      slug: "t-shirts",
      description: "Heavyweight organic cotton tees crafted with architectural precision and timeless drape.",
      imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
      displayOrder: 1,
      isActive: true,
    },
    {
      name: "Hoodies & Sweatshirts",
      slug: "hoodies",
      description: "Custom-milled french terry and brushed fleece essentials engineered for warmth and structure.",
      imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
      displayOrder: 2,
      isActive: true,
    },
    {
      name: "Shirts",
      slug: "shirts",
      description: "Structured camp collars, crisp poplins, and breathable luxury linens designed for effortless versatility.",
      imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80",
      displayOrder: 3,
      isActive: true,
    },
    {
      name: "Pants & Trousers",
      slug: "pants",
      description: "Tailored pleated trousers, relaxed denim, and structured cargo pants with modern relaxed contours.",
      imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80",
      displayOrder: 4,
      isActive: true,
    },
    {
      name: "Outerwear",
      slug: "outerwear",
      description: "Sculptural double-breasted wool coats, technical bombers, and minimal utility jackets.",
      imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80",
      displayOrder: 5,
      isActive: true,
    },
    {
      name: "Dresses & Co-ords",
      slug: "dresses",
      description: "Effortless silhouettes with premium draping, contemporary cuts, and timeless evening contours.",
      imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
      displayOrder: 6,
      isActive: true,
    },
    {
      name: "Footwear",
      slug: "footwear",
      description: "Brutalist leather loafers, minimalist Chelsea boots, and artisanal vulcanized sneakers.",
      imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80",
      displayOrder: 7,
      isActive: true,
    },
    {
      name: "Accessories",
      slug: "accessories",
      description: "Handcrafted Italian leather goods, architectural caps, and minimalist jewelry.",
      imageUrl: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80",
      displayOrder: 8,
      isActive: true,
    },
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      cat,
      { upsert: true, new: true }
    );
    categoryMap[cat.slug] = doc._id;
  }

  console.log("🌱 [Catalog Seed] Synchronizing brands...");
  const brandsData = [
    {
      name: "VogueThreads Atelier",
      slug: "voguethreads-atelier",
      description: "The pinnacle of modern bespoke luxury, crafting limited-run silhouettes using artisanal European and Japanese textiles.",
      logoUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80",
      coverImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
      website: "https://voguethreads.in",
      isActive: true,
    },
    {
      name: "Studio Minimal",
      slug: "studio-minimal",
      description: "Founded on clean lines, neutral earth tones, and 100% sustainable organic materials for everyday elevated living.",
      logoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
      coverImageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80",
      website: "https://studiominimal.in",
      isActive: true,
    },
    {
      name: "Urban Flux",
      slug: "urban-flux",
      description: "A high-velocity streetwear label bridging technical performance fabrics with bold architectural silhouettes.",
      logoUrl: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=400&q=80",
      coverImageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=80",
      website: "https://urbanflux.in",
      isActive: true,
    },
    {
      name: "Noir Collection",
      slug: "noir-collection",
      description: "Monochromatic luxury tailoring inspired by brutalist architecture, sharp geometry, and nocturnal aesthetics.",
      logoUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=400&q=80",
      coverImageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1600&q=80",
      website: "https://noircollection.in",
      isActive: true,
    },
  ];

  const brandMap = {};
  for (const br of brandsData) {
    const doc = await Brand.findOneAndUpdate(
      { slug: br.slug },
      br,
      { upsert: true, new: true }
    );
    brandMap[br.slug] = doc._id;
  }

  console.log("🌱 [Catalog Seed] Synchronizing collections...");
  const collectionsData = [
    {
      name: "Summer Monochrome 2026",
      slug: "summer-monochrome",
      description: "An editorial ode to brutalist contrast and minimalist summer tailoring. Crafted in airy linens and heavyweight cottons.",
      imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1800&q=80",
      isFeatured: true,
      status: "PUBLISHED",
      isActive: true,
    },
    {
      name: "Urban Minimalist Essentials",
      slug: "urban-essentials",
      description: "Everyday elevated wardrobe staples built with custom-spun Supima yarns for enduring structure and comfort.",
      imageUrl: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1800&q=80",
      isFeatured: true,
      status: "PUBLISHED",
      isActive: true,
    },
    {
      name: "Heavyweight Luxury Fleece",
      slug: "heavyweight-fleece",
      description: "480 GSM custom loopback french terry engineered for structured volume and uncompromising drape.",
      imageUrl: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1800&q=80",
      isFeatured: false,
      status: "PUBLISHED",
      isActive: true,
    },
    {
      name: "The Tailored Shift",
      slug: "tailored-shift",
      description: "Modern relaxed tailoring featuring double-pleated trousers, architectural lapels, and flowing silhouettes.",
      imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
      bannerUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1800&q=80",
      isFeatured: false,
      status: "PUBLISHED",
      isActive: true,
    },
  ];

  const collectionMap = {};
  for (const col of collectionsData) {
    const doc = await Collection.findOneAndUpdate(
      { slug: col.slug },
      col,
      { upsert: true, new: true }
    );
    collectionMap[col.slug] = doc._id;
  }

  console.log("🌱 [Catalog Seed] Synchronizing products & inventory...");
  const rawProducts = [
    {
      title: "Supima Cotton Heavyweight Boxy Tee",
      slug: "supima-cotton-heavyweight-boxy-tee",
      shortDescription: "280 GSM luxury combed Supima cotton in an architectural boxy drape.",
      description: "Cut from custom-spun 280 GSM organic Supima cotton, this boxy tee establishes a clean, structured silhouette that resists warping over time. Featuring a dense 1-inch bound ribbed collar, dropped shoulder seams, and blind stitch hemlines.",
      categorySlug: "t-shirts",
      brandSlug: "studio-minimal",
      collectionSlugs: ["summer-monochrome", "urban-essentials"],
      gender: "UNISEX",
      tags: ["Oversized", "Heavyweight", "100% Organic", "Trending", "Best Seller"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85",
          alt: "Supima Cotton Heavyweight Boxy Tee Front",
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85",
          alt: "Supima Cotton Heavyweight Boxy Tee Angle",
          sortOrder: 1,
        },
        {
          url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=85",
          alt: "Supima Cotton Heavyweight Boxy Tee Fabric Texture",
          sortOrder: 2,
        },
      ],
      attributes: [
        { name: "Material", value: "100% Organic Supima Cotton" },
        { name: "Fabric Weight", value: "280 GSM" },
        { name: "Fit", value: "Boxy / Relaxed Drop-Shoulder" },
        { name: "Collar", value: "1-inch High-Density Ribbed Knit" },
        { name: "Origin", value: "Crafted in Coimbatore, India" },
      ],
      careInstructions: [
        "Machine wash cold inside out with like colors",
        "Do not bleach or dry clean",
        "Tumble dry low or line dry in shade",
        "Iron on low heat if needed, avoiding prints",
      ],
      variants: [
        {
          variantId: "var_tee_blk_s",
          sku: "VT-SUPIMA-BLK-S",
          color: { name: "Jet Black", hex: "#141414", code: "BLK" },
          size: "S",
          price: 1899,
          compareAtPrice: 2499,
          stock: 15,
          sold: 42,
        },
        {
          variantId: "var_tee_blk_m",
          sku: "VT-SUPIMA-BLK-M",
          color: { name: "Jet Black", hex: "#141414", code: "BLK" },
          size: "M",
          price: 1899,
          compareAtPrice: 2499,
          stock: 22,
          sold: 84,
        },
        {
          variantId: "var_tee_blk_l",
          sku: "VT-SUPIMA-BLK-L",
          color: { name: "Jet Black", hex: "#141414", code: "BLK" },
          size: "L",
          price: 1899,
          compareAtPrice: 2499,
          stock: 18,
          sold: 56,
        },
        {
          variantId: "var_tee_blk_xl",
          sku: "VT-SUPIMA-BLK-XL",
          color: { name: "Jet Black", hex: "#141414", code: "BLK" },
          size: "XL",
          price: 1899,
          compareAtPrice: 2499,
          stock: 3, // Low stock test
          sold: 30,
        },
        {
          variantId: "var_tee_wht_s",
          sku: "VT-SUPIMA-WHT-S",
          color: { name: "Chalk White", hex: "#F3F1EC", code: "WHT" },
          size: "S",
          price: 1899,
          compareAtPrice: 2499,
          stock: 12,
          sold: 38,
        },
        {
          variantId: "var_tee_wht_m",
          sku: "VT-SUPIMA-WHT-M",
          color: { name: "Chalk White", hex: "#F3F1EC", code: "WHT" },
          size: "M",
          price: 1899,
          compareAtPrice: 2499,
          stock: 25,
          sold: 91,
        },
        {
          variantId: "var_tee_wht_l",
          sku: "VT-SUPIMA-WHT-L",
          color: { name: "Chalk White", hex: "#F3F1EC", code: "WHT" },
          size: "L",
          price: 1899,
          compareAtPrice: 2499,
          stock: 14,
          sold: 45,
        },
        {
          variantId: "var_tee_olv_m",
          sku: "VT-SUPIMA-OLV-M",
          color: { name: "Olive Khaki", hex: "#4A5240", code: "OLV" },
          size: "M",
          price: 1899,
          compareAtPrice: 2499,
          stock: 10,
          sold: 26,
        },
      ],
    },
    {
      title: "Architectural Oversized Mock-Neck Tee",
      slug: "architectural-oversized-mock-neck-tee",
      shortDescription: "Subtle mock-neck with tailored drape and heavy jersey finish.",
      description: "Designed for refined layering, this mock collar t-shirt bridges minimalist luxury and everyday comfort. The reinforced neck rib holds its contour gracefully throughout the day.",
      categorySlug: "t-shirts",
      brandSlug: "voguethreads-atelier",
      collectionSlugs: ["summer-monochrome", "tailored-shift"],
      gender: "UNISEX",
      tags: ["Editorial", "Mock Neck", "Trending", "New Arrival"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85",
          alt: "Architectural Oversized Mock-Neck Tee Black",
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85",
          alt: "Mock Neck Detail",
          sortOrder: 1,
        },
      ],
      attributes: [
        { name: "Material", value: "95% Combed Cotton, 5% Elastane" },
        { name: "Fabric Weight", value: "260 GSM" },
        { name: "Fit", value: "Tailored Oversized" },
        { name: "Neckline", value: "1.5-inch Mock Neck" },
      ],
      careInstructions: ["Machine wash cold with gentle detergent", "Lay flat to dry"],
      variants: [
        {
          variantId: "var_mock_blk_s",
          sku: "VT-MOCK-BLK-S",
          color: { name: "Pitch Black", hex: "#0D0D0D", code: "BLK" },
          size: "S",
          price: 2299,
          compareAtPrice: 2999,
          stock: 8,
          sold: 19,
        },
        {
          variantId: "var_mock_blk_m",
          sku: "VT-MOCK-BLK-M",
          color: { name: "Pitch Black", hex: "#0D0D0D", code: "BLK" },
          size: "M",
          price: 2299,
          compareAtPrice: 2999,
          stock: 14,
          sold: 35,
        },
        {
          variantId: "var_mock_blk_l",
          sku: "VT-MOCK-BLK-L",
          color: { name: "Pitch Black", hex: "#0D0D0D", code: "BLK" },
          size: "L",
          price: 2299,
          compareAtPrice: 2999,
          stock: 11,
          sold: 28,
        },
      ],
    },
    {
      title: "480 GSM Heavyweight French Terry Hoodie",
      slug: "480-gsm-heavyweight-french-terry-hoodie",
      shortDescription: "Double-layered sculptural hood, custom loopback terry, no drawstrings.",
      description: "Engineered with an ultra-dense 480 GSM 100% organic cotton loopback french terry. Designed without drawstrings for an uncompromising brutalist aesthetic, featuring a double-layered hood that stays upright, reinforced kangaroo pocket, and heavy ribbed cuffs.",
      categorySlug: "hoodies",
      brandSlug: "urban-flux",
      collectionSlugs: ["heavyweight-fleece", "urban-essentials"],
      gender: "UNISEX",
      tags: ["Heavyweight", "Best Seller", "Winter Core", "Trending"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=85",
          alt: "480 GSM French Terry Hoodie Front",
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=85",
          alt: "Hoodie Fabric Detail",
          sortOrder: 1,
        },
      ],
      attributes: [
        { name: "Material", value: "100% Combed Cotton Loopback French Terry" },
        { name: "Fabric Weight", value: "480 GSM" },
        { name: "Hood", value: "Double-Layered Self-Fabric Structural Hood" },
        { name: "Pocket", value: "Bar-tacked Kangaroo Pocket" },
      ],
      careInstructions: ["Wash cold inside out", "Hang dry recommended", "Do not iron print"],
      variants: [
        {
          variantId: "var_hd_blk_s",
          sku: "VT-HOOD-BLK-S",
          color: { name: "Washed Black", hex: "#1F1F1F", code: "BLK" },
          size: "S",
          price: 3499,
          compareAtPrice: 4499,
          stock: 10,
          sold: 48,
        },
        {
          variantId: "var_hd_blk_m",
          sku: "VT-HOOD-BLK-M",
          color: { name: "Washed Black", hex: "#1F1F1F", code: "BLK" },
          size: "M",
          price: 3499,
          compareAtPrice: 4499,
          stock: 20,
          sold: 110,
        },
        {
          variantId: "var_hd_blk_l",
          sku: "VT-HOOD-BLK-L",
          color: { name: "Washed Black", hex: "#1F1F1F", code: "BLK" },
          size: "L",
          price: 3499,
          compareAtPrice: 4499,
          stock: 16,
          sold: 82,
        },
        {
          variantId: "var_hd_gry_m",
          sku: "VT-HOOD-GRY-M",
          color: { name: "Concrete Grey", hex: "#8E8E93", code: "GRY" },
          size: "M",
          price: 3499,
          compareAtPrice: 4499,
          stock: 15,
          sold: 64,
        },
        {
          variantId: "var_hd_gry_l",
          sku: "VT-HOOD-GRY-L",
          color: { name: "Concrete Grey", hex: "#8E8E93", code: "GRY" },
          size: "L",
          price: 3499,
          compareAtPrice: 4499,
          stock: 12,
          sold: 51,
        },
      ],
    },
    {
      title: "Minimalist Half-Zip Sweatshirt",
      slug: "minimalist-half-zip-sweatshirt",
      shortDescription: "Polished gunmetal zipper, relaxed collar, and dense fleece body.",
      description: "A tailored take on modern athletic wear. Crafted with 380 GSM brushed interior fleece and fitted with an understated Japanese YKK gunmetal half-zip that transforms seamlessly between spread collar and turtle-neck.",
      categorySlug: "hoodies",
      brandSlug: "studio-minimal",
      collectionSlugs: ["urban-essentials"],
      gender: "UNISEX",
      tags: ["Half Zip", "Trending", "Clean Luxury"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=1000&q=85",
          alt: "Half-Zip Sweatshirt",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Material", value: "85% Cotton, 15% Recycled Polyester" },
        { name: "Hardware", value: "Japanese YKK Gunmetal Zipper" },
        { name: "Weight", value: "380 GSM" },
      ],
      careInstructions: ["Machine wash cold", "Dry flat"],
      variants: [
        {
          variantId: "var_hz_taupe_m",
          sku: "VT-HZIP-TAU-M",
          color: { name: "Sand Taupe", hex: "#C2B29F", code: "TAU" },
          size: "M",
          price: 2899,
          compareAtPrice: 3599,
          stock: 8,
          sold: 32,
        },
        {
          variantId: "var_hz_taupe_l",
          sku: "VT-HZIP-TAU-L",
          color: { name: "Sand Taupe", hex: "#C2B29F", code: "TAU" },
          size: "L",
          price: 2899,
          compareAtPrice: 3599,
          stock: 14,
          sold: 40,
        },
        {
          variantId: "var_hz_blk_m",
          sku: "VT-HZIP-BLK-M",
          color: { name: "Jet Black", hex: "#141414", code: "BLK" },
          size: "M",
          price: 2899,
          compareAtPrice: 3599,
          stock: 2, // Low stock urgency
          sold: 29,
        },
      ],
    },
    {
      title: "Double-Pleated Wide-Leg Trousers",
      slug: "double-pleated-wide-leg-trousers",
      shortDescription: "Fluid drape, deep forward double pleats, and extended waistband tab.",
      description: "Tailored from a premium wrinkle-resistant poly-viscose blend with an elegant wool-touch drape. Features dramatic double front pleats, slanted pockets, and an extended button-tab closure.",
      categorySlug: "pants",
      brandSlug: "voguethreads-atelier",
      collectionSlugs: ["summer-monochrome", "tailored-shift"],
      gender: "MEN",
      tags: ["Pleated", "Wide Leg", "Editorial", "Trending", "New Arrival"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=85",
          alt: "Double-Pleated Wide-Leg Trousers Front",
          sortOrder: 0,
        },
        {
          url: "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=1000&q=85",
          alt: "Trousers Silhouette",
          sortOrder: 1,
        },
      ],
      attributes: [
        { name: "Composition", value: "65% Poly, 33% Viscose, 2% Spandex" },
        { name: "Rise", value: "High Rise with Extended Waistband" },
        { name: "Leg Profile", value: "Relaxed Wide-Leg" },
      ],
      careInstructions: ["Dry clean recommended or gentle hand wash"],
      variants: [
        {
          variantId: "var_trs_blk_30",
          sku: "VT-TR-BLK-30",
          color: { name: "Pitch Black", hex: "#101010", code: "BLK" },
          size: "30",
          price: 3999,
          compareAtPrice: 4999,
          stock: 7,
          sold: 22,
        },
        {
          variantId: "var_trs_blk_32",
          sku: "VT-TR-BLK-32",
          color: { name: "Pitch Black", hex: "#101010", code: "BLK" },
          size: "32",
          price: 3999,
          compareAtPrice: 4999,
          stock: 16,
          sold: 45,
        },
        {
          variantId: "var_trs_blk_34",
          sku: "VT-TR-BLK-34",
          color: { name: "Pitch Black", hex: "#101010", code: "BLK" },
          size: "34",
          price: 3999,
          compareAtPrice: 4999,
          stock: 12,
          sold: 38,
        },
        {
          variantId: "var_trs_stn_32",
          sku: "VT-TR-STN-32",
          color: { name: "Stone Grey", hex: "#A8A59D", code: "STN" },
          size: "32",
          price: 3999,
          compareAtPrice: 4999,
          stock: 9,
          sold: 27,
        },
      ],
    },
    {
      title: "Relaxed Fit Selvedge Denim Jeans",
      slug: "relaxed-fit-selvedge-denim-jeans",
      shortDescription: "13.5 oz Japanese selvedge denim in an authentic raw straight-leg cut.",
      description: "Woven on vintage shuttle looms using ring-spun cotton yarns. Features signature red-line selvedge ID, custom matte-finish silver shanks, and reinforced hidden pocket rivets.",
      categorySlug: "pants",
      brandSlug: "studio-minimal",
      collectionSlugs: ["urban-essentials"],
      gender: "UNISEX",
      tags: ["Selvedge", "Raw Denim", "Best Seller"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=1000&q=85",
          alt: "Relaxed Selvedge Denim",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Denim Weight", value: "13.5 oz Raw Rigid" },
        { name: "Composition", value: "100% Zimbabwe Cotton" },
        { name: "Hardware", value: "Custom Engraved Nickel Shanks" },
      ],
      careInstructions: ["Soak inside out in cold water", "Hang dry"],
      variants: [
        {
          variantId: "var_dnm_ind_30",
          sku: "VT-DNM-IND-30",
          color: { name: "Raw Indigo", hex: "#1B2838", code: "IND" },
          size: "30",
          price: 4299,
          compareAtPrice: 5499,
          stock: 10,
          sold: 30,
        },
        {
          variantId: "var_dnm_ind_32",
          sku: "VT-DNM-IND-32",
          color: { name: "Raw Indigo", hex: "#1B2838", code: "IND" },
          size: "32",
          price: 4299,
          compareAtPrice: 5499,
          stock: 18,
          sold: 62,
        },
        {
          variantId: "var_dnm_ind_34",
          sku: "VT-DNM-IND-34",
          color: { name: "Raw Indigo", hex: "#1B2838", code: "IND" },
          size: "34",
          price: 4299,
          compareAtPrice: 5499,
          stock: 8,
          sold: 25,
        },
      ],
    },
    {
      title: "Structured Linen Camp Collar Shirt",
      slug: "structured-linen-camp-collar-shirt",
      shortDescription: "100% French flax linen with relaxed Cuban lapels and mother-of-pearl buttons.",
      description: "Airy yet textured, this summer essential is crafted from Normandy flax linen that softens with every wash. Designed with an open Cuban collar, straight hem with side splits, and genuine smoke shell buttons.",
      categorySlug: "shirts",
      brandSlug: "voguethreads-atelier",
      collectionSlugs: ["summer-monochrome", "tailored-shift"],
      gender: "MEN",
      tags: ["Camp Collar", "100% Linen", "Summer 2026", "Trending"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=85",
          alt: "Structured Linen Camp Shirt Front",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Fabric", value: "100% Normandy Flax Linen" },
        { name: "Collar", value: "Cuban Camp Collar" },
        { name: "Buttons", value: "Carved Mother-of-Pearl" },
      ],
      careInstructions: ["Machine wash gentle cold", "Hang dry in shade"],
      variants: [
        {
          variantId: "var_sh_wht_s",
          sku: "VT-SH-WHT-S",
          color: { name: "Optical White", hex: "#FFFFFF", code: "WHT" },
          size: "S",
          price: 2799,
          compareAtPrice: 3499,
          stock: 10,
          sold: 28,
        },
        {
          variantId: "var_sh_wht_m",
          sku: "VT-SH-WHT-M",
          color: { name: "Optical White", hex: "#FFFFFF", code: "WHT" },
          size: "M",
          price: 2799,
          compareAtPrice: 3499,
          stock: 15,
          sold: 52,
        },
        {
          variantId: "var_sh_wht_l",
          sku: "VT-SH-WHT-L",
          color: { name: "Optical White", hex: "#FFFFFF", code: "WHT" },
          size: "L",
          price: 2799,
          compareAtPrice: 3499,
          stock: 8,
          sold: 34,
        },
        {
          variantId: "var_sh_ter_m",
          sku: "VT-SH-TER-M",
          color: { name: "Earthy Terracotta", hex: "#C36B4F", code: "TER" },
          size: "M",
          price: 2799,
          compareAtPrice: 3499,
          stock: 11,
          sold: 39,
        },
      ],
    },
    {
      title: "Relaxed Poplin Oversized Shirt",
      slug: "relaxed-poplin-oversized-shirt",
      shortDescription: "Crisp 120s two-ply organic cotton poplin in an exaggerated drape.",
      description: "A masterclass in modern shirting. Constructed with high-density Italian cotton poplin offering a silky crisp hand feel, exaggerated cuffs, and a curved high-low hem.",
      categorySlug: "shirts",
      brandSlug: "studio-minimal",
      collectionSlugs: ["urban-essentials"],
      gender: "UNISEX",
      tags: ["Poplin", "Oversized", "Clean Luxury"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=85",
          alt: "Relaxed Poplin Shirt",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Weave", value: "120s Two-Ply Poplin" },
        { name: "Composition", value: "100% GOTS Certified Organic Cotton" },
      ],
      careInstructions: ["Warm iron while slightly damp"],
      variants: [
        {
          variantId: "var_pop_wht_m",
          sku: "VT-POP-WHT-M",
          color: { name: "Crisp White", hex: "#FAFAFA", code: "WHT" },
          size: "M",
          price: 2499,
          compareAtPrice: 3199,
          stock: 14,
          sold: 41,
        },
        {
          variantId: "var_pop_wht_l",
          sku: "VT-POP-WHT-L",
          color: { name: "Crisp White", hex: "#FAFAFA", code: "WHT" },
          size: "L",
          price: 2499,
          compareAtPrice: 3199,
          stock: 9,
          sold: 23,
        },
      ],
    },
    {
      title: "Sculptural Double-Breasted Wool Overcoat",
      slug: "sculptural-double-breasted-wool-overcoat",
      shortDescription: "700 GSM virgin melton wool with broad peak lapels and structured shoulders.",
      description: "An iconic statement piece crafted from heavyweight 700 GSM Australian virgin wool. Designed with sharp architectural shoulder pads, horn buttons, deep flap pockets, and a full Bemberg cupro lining.",
      categorySlug: "outerwear",
      brandSlug: "voguethreads-atelier",
      collectionSlugs: ["tailored-shift"],
      gender: "UNISEX",
      tags: ["Luxury", "Editorial", "Wool", "Winter Core"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85",
          alt: "Sculptural Wool Overcoat Black",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Shell", value: "100% Australian Virgin Melton Wool (700 GSM)" },
        { name: "Lining", value: "100% Japanese Bemberg Cupro" },
        { name: "Buttons", value: "Real Horn Buttons" },
      ],
      careInstructions: ["Specialist dry clean only"],
      variants: [
        {
          variantId: "var_coat_blk_m",
          sku: "VT-COAT-BLK-M",
          color: { name: "Midnight Black", hex: "#080808", code: "BLK" },
          size: "M",
          price: 8999,
          compareAtPrice: 11999,
          stock: 5,
          sold: 14,
        },
        {
          variantId: "var_coat_blk_l",
          sku: "VT-COAT-BLK-L",
          color: { name: "Midnight Black", hex: "#080808", code: "BLK" },
          size: "L",
          price: 8999,
          compareAtPrice: 11999,
          stock: 4,
          sold: 11,
        },
      ],
    },
    {
      title: "Technical Cropped Bomber Jacket",
      slug: "technical-cropped-bomber-jacket",
      shortDescription: "Water-repellent memory nylon, custom sleeve pocket, and ruched seams.",
      description: "Infused with utility aesthetics, this cropped bomber utilizes high-density flight nylon with a water-resistant Teflon finish. Features heavy gauge two-way zipper and ribbed storm cuffs.",
      categorySlug: "outerwear",
      brandSlug: "urban-flux",
      collectionSlugs: ["urban-essentials"],
      gender: "UNISEX",
      tags: ["Bomber", "Technical", "Water Repellent", "Trending"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85",
          alt: "Technical Bomber Jacket",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Shell", value: "100% Recycled Water-Repellent Flight Nylon" },
        { name: "Insulation", value: "PrimaLoft® 100g Thermal Fill" },
      ],
      careInstructions: ["Wipe clean or dry clean"],
      variants: [
        {
          variantId: "var_bmb_blk_m",
          sku: "VT-BMB-BLK-M",
          color: { name: "Matte Black", hex: "#151515", code: "BLK" },
          size: "M",
          price: 5499,
          compareAtPrice: 6999,
          stock: 8,
          sold: 21,
        },
        {
          variantId: "var_bmb_blk_l",
          sku: "VT-BMB-BLK-L",
          color: { name: "Matte Black", hex: "#151515", code: "BLK" },
          size: "L",
          price: 5499,
          compareAtPrice: 6999,
          stock: 6,
          sold: 18,
        },
      ],
    },
    {
      title: "Monochrome Drape Maxi Slip Dress",
      slug: "monochrome-drape-maxi-slip-dress",
      shortDescription: "Heavyweight matte silk charmeuse with fluid bias cut and back cowl detail.",
      description: "Cut on the bias to cascade effortlessly over contours, this minimalist maxi slip dress is crafted in 22mm heavyweight silk charmeuse. Features delicate micro straps and an open low cowl back.",
      categorySlug: "dresses",
      brandSlug: "noir-collection",
      collectionSlugs: ["summer-monochrome"],
      gender: "WOMEN",
      tags: ["Slip Dress", "Silk", "Trending", "Editorial", "New Arrival"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85",
          alt: "Monochrome Drape Maxi Slip Dress",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Fabric", value: "100% Mulberry Silk Charmeuse (22 Momme)" },
        { name: "Cut", value: "Bias Silhouette" },
      ],
      careInstructions: ["Dry clean only"],
      variants: [
        {
          variantId: "var_dr_blk_xs",
          sku: "VT-DRS-BLK-XS",
          color: { name: "Jet Black", hex: "#0E0E0E", code: "BLK" },
          size: "XS",
          price: 4499,
          compareAtPrice: 5999,
          stock: 5,
          sold: 15,
        },
        {
          variantId: "var_dr_blk_s",
          sku: "VT-DRS-BLK-S",
          color: { name: "Jet Black", hex: "#0E0E0E", code: "BLK" },
          size: "S",
          price: 4499,
          compareAtPrice: 5999,
          stock: 10,
          sold: 34,
        },
        {
          variantId: "var_dr_blk_m",
          sku: "VT-DRS-BLK-M",
          color: { name: "Jet Black", hex: "#0E0E0E", code: "BLK" },
          size: "M",
          price: 4499,
          compareAtPrice: 5999,
          stock: 7,
          sold: 21,
        },
      ],
    },
    {
      title: "Ribbed Knit Column Co-ord Set",
      slug: "ribbed-knit-column-co-ord-set",
      shortDescription: "Ultra-fine ribbed modal knit top and matching ankle-skimming column skirt.",
      description: "The ultimate elevated daily uniform. Knitted in a soft, body-skimming ribbed modal blend that stretches comfortably while maintaining clean vertical lines.",
      categorySlug: "dresses",
      brandSlug: "studio-minimal",
      collectionSlugs: ["summer-monochrome"],
      gender: "WOMEN",
      tags: ["Co-ord", "Ribbed Knit", "Trending"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1000&q=85",
          alt: "Ribbed Knit Column Co-ord Set",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Composition", value: "92% Lenzing Modal, 8% Spandex" },
        { name: "Structure", value: "2x2 Wide Needle Rib" },
      ],
      careInstructions: ["Hand wash cold, dry flat"],
      variants: [
        {
          variantId: "var_crd_oat_s",
          sku: "VT-CRD-OAT-S",
          color: { name: "Oat Beige", hex: "#D7CEB2", code: "OAT" },
          size: "S",
          price: 3799,
          compareAtPrice: 4699,
          stock: 9,
          sold: 22,
        },
        {
          variantId: "var_crd_oat_m",
          sku: "VT-CRD-OAT-M",
          color: { name: "Oat Beige", hex: "#D7CEB2", code: "OAT" },
          size: "M",
          price: 3799,
          compareAtPrice: 4699,
          stock: 12,
          sold: 31,
        },
      ],
    },
    {
      title: "Brutalist Chunky Leather Loafers",
      slug: "brutalist-chunky-leather-loafers",
      shortDescription: "Polished Italian calfskin leather with chunky lug sole and tonal stitching.",
      description: "Crafted in artisanal Italian workshops using semi-gloss box calf leather. Anchored by an ultra-lightweight 45mm Vibram lug sole for confident all-day walking.",
      categorySlug: "footwear",
      brandSlug: "voguethreads-atelier",
      collectionSlugs: ["summer-monochrome", "tailored-shift"],
      gender: "UNISEX",
      tags: ["Footwear", "Leather", "Vibram", "Best Seller"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85",
          alt: "Brutalist Chunky Loafers",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Upper", value: "100% Full-Grain Italian Calfskin" },
        { name: "Sole", value: "45mm Vibram Commando Lug Sole" },
      ],
      careInstructions: ["Condition with natural beeswax cream"],
      variants: [
        {
          variantId: "var_sho_blk_41",
          sku: "VT-SHO-BLK-41",
          color: { name: "Polished Black", hex: "#111111", code: "BLK" },
          size: "41",
          price: 6499,
          compareAtPrice: 8299,
          stock: 6,
          sold: 14,
        },
        {
          variantId: "var_sho_blk_42",
          sku: "VT-SHO-BLK-42",
          color: { name: "Polished Black", hex: "#111111", code: "BLK" },
          size: "42",
          price: 6499,
          compareAtPrice: 8299,
          stock: 8,
          sold: 26,
        },
        {
          variantId: "var_sho_blk_43",
          sku: "VT-SHO-BLK-43",
          color: { name: "Polished Black", hex: "#111111", code: "BLK" },
          size: "43",
          price: 6499,
          compareAtPrice: 8299,
          stock: 5,
          sold: 19,
        },
      ],
    },
    {
      title: "Structured Italian Leather Crossbody Bag",
      slug: "structured-italian-leather-crossbody-bag",
      shortDescription: "Rigid box calf leather with magnetic flap and adjustable wide webbing strap.",
      description: "Architectural proportions meet daily utility. Handcrafted with matte smooth calf leather and finished with subtle debossed silver foil branding and microfiber suede interior.",
      categorySlug: "accessories",
      brandSlug: "noir-collection",
      collectionSlugs: ["summer-monochrome"],
      gender: "UNISEX",
      tags: ["Leather Bag", "Minimalist", "Trending"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85",
          alt: "Leather Crossbody Bag",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Leather", value: "Italian Smooth Box Calf" },
        { name: "Dimensions", value: "22cm x 16cm x 7cm" },
      ],
      careInstructions: ["Store in provided protective dust bag"],
      variants: [
        {
          variantId: "var_bag_blk_one",
          sku: "VT-BAG-BLK-ONE",
          color: { name: "Matte Black", hex: "#161616", code: "BLK" },
          size: "ONE SIZE",
          price: 3999,
          compareAtPrice: 4999,
          stock: 12,
          sold: 37,
        },
      ],
    },
    {
      title: "Heavy Gauge Brushed Wool Scarf",
      slug: "heavy-gauge-brushed-wool-scarf",
      shortDescription: "Ultra-soft brushed alpaca & wool blend with chunky fringe edges.",
      description: "Generously sized at 200cm x 40cm, this cloud-soft wrap is crafted from a plush blend of Peruvian baby alpaca and fine merino wool for luxurious warmth.",
      categorySlug: "accessories",
      brandSlug: "studio-minimal",
      collectionSlugs: ["heavyweight-fleece"],
      gender: "UNISEX",
      tags: ["Wool Scarf", "Winter Warmth"],
      primaryImages: [
        {
          url: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1000&q=85",
          alt: "Brushed Wool Scarf",
          sortOrder: 0,
        },
      ],
      attributes: [
        { name: "Material", value: "70% Baby Alpaca, 30% Merino Wool" },
        { name: "Dimensions", value: "200cm x 40cm" },
      ],
      careInstructions: ["Hand wash cold or dry clean"],
      variants: [
        {
          variantId: "var_scf_gry_one",
          sku: "VT-SCF-GRY-ONE",
          color: { name: "Charcoal Heather", hex: "#4A4A4A", code: "GRY" },
          size: "ONE SIZE",
          price: 1499,
          compareAtPrice: 1999,
          stock: 20,
          sold: 45,
        },
      ],
    },
  ];

  const createdProducts = [];
  for (const item of rawProducts) {
    const categoryId = categoryMap[item.categorySlug];
    const brandId = brandMap[item.brandSlug];
    const collectionIds = item.collectionSlugs.map((s) => collectionMap[s]).filter(Boolean);

    const variantsFormatted = item.variants.map((v) => ({
      variantId: v.variantId,
      sku: v.sku,
      color: v.color,
      size: v.size,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      costPrice: Math.round(v.price * 0.35),
      weightGrams: 300,
      availability: v.stock > 4 ? "IN_STOCK" : v.stock > 0 ? "LOW_STOCK" : "OUT_OF_STOCK",
      cachedStock: {
        onHand: v.stock,
        reserved: 0,
        available: v.stock,
      },
      isActive: true,
      images: item.primaryImages,
    }));

    const productDoc = await Product.findOneAndUpdate(
      { slug: item.slug },
      {
        title: item.title,
        slug: item.slug,
        description: item.description,
        shortDescription: item.shortDescription,
        categoryId,
        brandId,
        collectionIds,
        status: "PUBLISHED",
        gender: item.gender,
        primaryImages: item.primaryImages,
        variants: variantsFormatted,
        attributes: item.attributes,
        careInstructions: item.careInstructions,
        tags: item.tags,
        isDeleted: false,
      },
      { upsert: true, new: true }
    );

    createdProducts.push(productDoc);

    // Sync Inventory collection for each variant
    for (const v of item.variants) {
      await Inventory.findOneAndUpdate(
        { variantSku: v.sku },
        {
          variantSku: v.sku,
          productId: productDoc._id,
          variantId: v.variantId,
          onHand: v.stock,
          reserved: 0,
          available: v.stock,
          soldCount: v.sold || 0,
          lowStockThreshold: 5,
          allowBackorder: false,
        },
        { upsert: true, new: true }
      );
    }
  }

  // Update collection product lists
  for (const [slug, collectionId] of Object.entries(collectionMap)) {
    const matchingProducts = createdProducts.filter((p) =>
      p.collectionIds.some((cid) => cid.equals(collectionId))
    );
    await Collection.findByIdAndUpdate(collectionId, {
      products: matchingProducts.map((p, idx) => ({ product: p._id, position: idx })),
    });
  }

  // Update category product counts
  for (const [slug, categoryId] of Object.entries(categoryMap)) {
    const count = await Product.countDocuments({ categoryId, isDeleted: false, status: "PUBLISHED" });
    await Category.findByIdAndUpdate(categoryId, { productCount: count });
  }

  console.log("🌱 [Catalog Seed] Synchronizing authentic customer reviews...");
  const reviewsData = [
    {
      productSlug: "supima-cotton-heavyweight-boxy-tee",
      customerName: "Aarav Sharma",
      customerEmail: "aarav.sharma@example.com",
      rating: 5,
      title: "Unmatched fabric weight and drape",
      content: "The 280 GSM collar does not bacon or sag even after 10 washes. The drop shoulder fits exactly like high-end designer blanks. Hands down the best tee I own.",
      isVerifiedBuyer: true,
      status: "APPROVED",
      helpfulVotes: 19,
      adminResponse: {
        response: "Thank you Aarav! We engineered the collar with reinforced knit binding specifically for that lasting structure.",
        respondedBy: "VogueThreads Concierge",
        respondedAt: new Date(),
        isPublic: true,
      },
    },
    {
      productSlug: "supima-cotton-heavyweight-boxy-tee",
      customerName: "Rhea Kapoor",
      customerEmail: "rhea.kapoor@example.com",
      rating: 5,
      title: "Perfect minimalist luxury silhouette",
      content: "Got size M in Chalk White. It's completely opaque and has that structured architectural volume without feeling stiff. Incredible value.",
      isVerifiedBuyer: true,
      status: "APPROVED",
      helpfulVotes: 12,
    },
    {
      productSlug: "480-gsm-heavyweight-french-terry-hoodie",
      customerName: "Kabir Mehta",
      customerEmail: "kabir.mehta@example.com",
      rating: 5,
      title: "The double-layered hood is phenomenal",
      content: "No floppy hood here—it stands up completely on its own like a sculpture. Heavy, warm, and the lack of drawstrings gives it such a clean elevated look.",
      isVerifiedBuyer: true,
      status: "APPROVED",
      helpfulVotes: 24,
    },
    {
      productSlug: "double-pleated-wide-leg-trousers",
      customerName: "Devansh Patel",
      customerEmail: "devansh.patel@example.com",
      rating: 5,
      title: "Drapes like a dream",
      content: "Wore these to gallery opening night in Mumbai and received multiple compliments. The pleats are razor sharp and the fabric flows effortlessly when walking.",
      isVerifiedBuyer: true,
      status: "APPROVED",
      helpfulVotes: 15,
    },
    {
      productSlug: "structured-linen-camp-collar-shirt",
      customerName: "Vikram Singhania",
      customerEmail: "vikram.s@example.com",
      rating: 4,
      title: "Great summer texture, slightly relaxed",
      content: "Real French linen feels noticeably cooler than regular blends. Buttons are genuine shell. Runs slightly loose so consider sizing down if you want a snug fit.",
      isVerifiedBuyer: true,
      status: "APPROVED",
      helpfulVotes: 8,
    },
  ];

  for (const rev of reviewsData) {
    const product = createdProducts.find((p) => p.slug === rev.productSlug);
    if (product) {
      await Review.findOneAndUpdate(
        { productId: product._id, customerEmail: rev.customerEmail },
        {
          productId: product._id,
          customerName: rev.customerName,
          customerEmail: rev.customerEmail,
          rating: rev.rating,
          title: rev.title,
          content: rev.content,
          isVerifiedBuyer: rev.isVerifiedBuyer,
          status: rev.status,
          helpfulVotes: rev.helpfulVotes,
          adminResponse: rev.adminResponse,
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log("🌱 [Catalog Seed] Synchronizing promotions & discounts...");
  await Discount.findOneAndUpdate(
    { name: "Summer Monochrome Launch" },
    {
      name: "Summer Monochrome Launch",
      description: "Enjoy 20% off all architectural summer essentials.",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minimumOrderValue: 1999,
      status: "ACTIVE",
      startAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      appliesTo: "ALL_PRODUCTS",
    },
    { upsert: true, new: true }
  );

  console.log("✨ [Catalog Seed] Rich luxury fashion catalog seeded successfully!");
  console.log(`   - Categories: ${Object.keys(categoryMap).length}`);
  console.log(`   - Brands: ${Object.keys(brandMap).length}`);
  console.log(`   - Collections: ${Object.keys(collectionMap).length}`);
  console.log(`   - Products: ${createdProducts.length}`);
  console.log(`   - Total SKUs & Inventories synced: ${createdProducts.reduce((acc, p) => acc + p.variants.length, 0)}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ [Catalog Seed] Error seeding catalog:", err);
  process.exit(1);
});
