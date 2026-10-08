import { connectToDatabase } from "./mongoose.js";
import {
  Product,
  Category,
  Brand,
  Collection,
  Review,
  Inventory,
  Discount,
  Setting,
} from "../models/index.js";

/**
 * Convert MongoDB documents to clean JSON-serializable plain objects
 */
function serializeDoc(doc) {
  if (!doc) return null;
  return JSON.parse(JSON.stringify(doc));
}

// In-memory catalog cache with TTL to eliminate repeated MongoDB roundtrips
const catalogCache = new Map();

export function getCached(key, ttlSeconds = 60) {
  const item = catalogCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > ttlSeconds * 1000) {
    catalogCache.delete(key);
    return null;
  }
  return item.data;
}

export function setCached(key, data) {
  if (catalogCache.size > 300) {
    const oldestKey = catalogCache.keys().next().value;
    catalogCache.delete(oldestKey);
  }
  catalogCache.set(key, { data, timestamp: Date.now() });
}

export function clearCatalogCache(prefix = "") {
  if (!prefix) {
    catalogCache.clear();
    return;
  }
  for (const key of catalogCache.keys()) {
    if (key.startsWith(prefix)) {
      catalogCache.delete(key);
    }
  }
}

/**
 * Format product item for card display with calculated metrics
 */
export function formatProductCard(product) {
  if (!product) return null;
  const p = serializeDoc(product);
  const variants = p.variants || [];

  // Determine lowest price & compare price
  let minPrice = Infinity;
  let comparePrice = 0;
  variants.forEach((v) => {
    if (v.price < minPrice) {
      minPrice = v.price;
      comparePrice = v.compareAtPrice || 0;
    }
  });
  if (minPrice === Infinity) minPrice = 0;

  const discountPercent =
    comparePrice > minPrice
      ? Math.round(((comparePrice - minPrice) / comparePrice) * 100)
      : 0;

  // Extract unique colors
  const colorMap = new Map();
  variants.forEach((v) => {
    if (v.color?.name && !colorMap.has(v.color.name)) {
      colorMap.set(v.color.name, {
        name: v.color.name,
        hex: v.color.hex,
        code: v.color.code,
      });
    }
  });

  // Extract unique sizes
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];

  // Stock status
  const totalStock = variants.reduce((sum, v) => sum + (v.cachedStock?.available || 0), 0);
  const isOutOfStock = totalStock <= 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;

  return {
    _id: p._id,
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription || "",
    brand: p.brandId?.name || (typeof p.brandId === "string" ? "VogueThreads" : "VogueThreads"),
    brandSlug: p.brandId?.slug || "voguethreads-atelier",
    category: p.categoryId?.name || "",
    categorySlug: p.categoryId?.slug || "",
    primaryImage: p.primaryImages?.[0]?.url || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    hoverImage: p.primaryImages?.[1]?.url || p.primaryImages?.[0]?.url || "",
    price: minPrice,
    compareAtPrice: comparePrice > minPrice ? comparePrice : null,
    discountPercent,
    colors: Array.from(colorMap.values()),
    sizes,
    totalStock,
    isOutOfStock,
    isLowStock,
    tags: p.tags || [],
    rating: p.rating || 4.8,
    reviewCount: p.reviewCount || 12,
  };
}

/**
 * Fetch Homepage Dynamic Data
 */
export async function getHomeData() {
  const cacheKey = "home_data";
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();

  const [categories, featuredCollection, publishedProducts, storeSetting, discounts, allActiveCollections] =
    await Promise.all([
      Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean(),
      Collection.findOne({ isFeatured: true, status: "PUBLISHED" })
        .populate("products.product")
        .lean(),
      Product.find({ isDeleted: false, status: "PUBLISHED" })
        .populate("brandId", "name slug")
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .lean(),
      Setting.findOne().lean(),
      Discount.find({ status: "ACTIVE" }).lean(),
      Collection.find({ status: "PUBLISHED", isActive: true })
        .sort({ isFeatured: -1, createdAt: -1 })
        .lean(),
    ]);

  const allFormatted = publishedProducts.map(formatProductCard);

  // New Arrivals: Latest 8 published products
  const newArrivals = allFormatted.slice(0, 8);

  // Featured Products: items with tag "Trending" or "Best Seller" or first 8
  const featuredProducts = allFormatted
    .filter((p) => p.tags.includes("Trending") || p.tags.includes("Best Seller"))
    .slice(0, 8);

  // Best Sellers: items with "Best Seller" tag or highest stock velocity
  const bestSellers = allFormatted
    .filter((p) => p.tags.includes("Best Seller"))
    .slice(0, 8);

  // Fallback to top products if tags filter yields less than 4
  const finalFeatured = featuredProducts.length >= 4 ? featuredProducts : allFormatted.slice(0, 8);
  const finalBestSellers = bestSellers.length >= 4 ? bestSellers : allFormatted.slice(0, 8);

  // Format Dynamic Hero Slides directly from Live MongoDB Atlas Collections
  const heroSlides = allActiveCollections.length > 0
    ? allActiveCollections.map((col, idx) => ({
        id: `hero-${col._id || idx}`,
        eyebrow: col.isFeatured ? "FEATURED EDITORIAL CAPSULE" : "LIMITED ARCHIVE RELEASE",
        hasPulse: idx === 0,
        title: (col.name || "").toUpperCase(),
        description: col.description || "Architectural silhouettes, custom-milled textiles, and elevated everyday luxury.",
        image: col.bannerUrl || col.imageUrl || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=85",
        imageAlt: `${col.name} Fashion Showcase`,
        collection: col.name,
        edition: col.isFeatured ? "Milano Runway Exclusive" : "Curated Capsule",
        monogram: "VT",
        pieceLabel: "Spotlight Capsule",
        pieceTitle: col.name,
        primaryCta: { label: "EXPLORE CAPSULE", text: "EXPLORE CAPSULE", href: `/collection/${col.slug}` },
        secondaryCta: { label: "VIEW CATALOG", text: "VIEW CATALOG", href: "/shop" },
      }))
    : [
        {
          id: "hero-1",
          eyebrow: "ARCHITECTURAL LUXURY",
          hasPulse: true,
          title: "VOGUETHREADS ATELIER",
          description: "Elevated silhouettes, custom-milled heavyweight textiles, and bespoke tailoring engineered for timeless distinction.",
          image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=85",
          imageAlt: "VogueThreads Fashion Campaign",
          collection: "Atelier Edition",
          edition: "Core Collection",
          monogram: "VT",
          pieceLabel: "Featured Piece",
          pieceTitle: "Bespoke Tailoring",
          primaryCta: { label: "EXPLORE CATALOG", text: "EXPLORE CATALOG", href: "/shop" },
          secondaryCta: { label: "VIEW COLLECTIONS", text: "VIEW COLLECTIONS", href: "/collections" },
        },
      ];

  const result = {
    heroSlides,
    categories: categories.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80",
      productCount: c.productCount || 0,
    })),
    featuredProducts: finalFeatured,
    newArrivals,
    bestSellers: finalBestSellers,
    featuredCollection: featuredCollection
      ? {
          _id: featuredCollection._id.toString(),
          name: featuredCollection.name,
          slug: featuredCollection.slug,
          description: featuredCollection.description,
          bannerUrl: featuredCollection.bannerUrl,
          imageUrl: featuredCollection.imageUrl,
          products: (featuredCollection.products || [])
            .map((item) => formatProductCard(item.product))
            .filter(Boolean)
            .slice(0, 4),
        }
      : null,
    activePromotions: discounts.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      description: d.description,
      discountType: d.discountType,
      discountValue: d.discountValue,
      minimumOrderValue: d.minimumOrderValue,
    })),
    settings: {
      freeShippingThreshold: storeSetting?.shipping?.freeShippingThreshold || 999,
      standardShippingFee: storeSetting?.shipping?.standardShippingFee || 49,
      returnWindowDays: storeSetting?.shipping?.returnWindowDays || 7,
      estimatedDeliveryDays: storeSetting?.shipping?.estimatedDeliveryDays || "3-5 Business Days",
    },
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Filtered, Sorted, and Paginated Products for /shop, /category, /collection, /brand
 */
export async function getProducts({
  category,
  brand,
  collection,
  size,
  color,
  minPrice,
  maxPrice,
  gender,
  inStock,
  onSale,
  search,
  sort = "featured",
  page = 1,
  limit = 12,
} = {}) {
  const cacheKey = `products_${category || ""}_${brand || ""}_${collection || ""}_${size || ""}_${color || ""}_${minPrice || ""}_${maxPrice || ""}_${gender || ""}_${inStock || ""}_${onSale || ""}_${search || ""}_${sort}_${page}_${limit}`;
  const cached = getCached(cacheKey, 30);
  if (cached) return cached;

  await connectToDatabase();

  const query = { isDeleted: false, status: "PUBLISHED" };

  // 1. Category Filter
  if (category && category !== "all") {
    const catDoc = await Category.findOne({ slug: category }).lean();
    if (catDoc) {
      // Also check subcategories
      const subCats = await Category.find({ parentId: catDoc._id }).lean();
      const allCatIds = [catDoc._id, ...subCats.map((s) => s._id)];
      query.categoryId = { $in: allCatIds };
    }
  }

  // 2. Brand Filter
  if (brand && brand !== "all") {
    const brandDoc = await Brand.findOne({ slug: brand }).lean();
    if (brandDoc) {
      query.brandId = brandDoc._id;
    }
  }

  // 3. Collection Filter
  if (collection && collection !== "all") {
    const colDoc = await Collection.findOne({ slug: collection }).lean();
    if (colDoc) {
      query.collectionIds = colDoc._id;
    }
  }

  // 4. Gender Filter
  if (gender && gender !== "ALL") {
    query.gender = { $in: [gender.toUpperCase(), "UNISEX"] };
  }

  // 5. Size Filter
  if (size) {
    const sizes = Array.isArray(size) ? size : size.split(",").map((s) => s.trim());
    query["variants.size"] = { $in: sizes };
  }

  // 6. Color Filter
  if (color) {
    const colors = Array.isArray(color) ? color : color.split(",").map((c) => c.trim());
    query["variants.color.name"] = { $in: colors };
  }

  // 7. Price Range Filter
  if (minPrice || maxPrice) {
    const priceCond = {};
    if (minPrice) priceCond.$gte = Number(minPrice);
    if (maxPrice) priceCond.$lte = Number(maxPrice);
    query["variants.price"] = priceCond;
  }

  // 8. In Stock Only
  if (inStock === "true" || inStock === true) {
    query["variants.cachedStock.available"] = { $gt: 0 };
  }

  // 9. Text Search
  if (search && search.trim()) {
    const term = search.trim();
    query.$or = [
      { title: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
      { tags: { $regex: term, $options: "i" } },
      { "variants.sku": { $regex: term, $options: "i" } },
    ];
  }

  // Sorting
  let sortOptions = { createdAt: -1 };
  switch (sort) {
    case "newest":
      sortOptions = { createdAt: -1 };
      break;
    case "price-asc":
      sortOptions = { "variants.0.price": 1 };
      break;
    case "price-desc":
      sortOptions = { "variants.0.price": -1 };
      break;
    case "best-selling":
      sortOptions = { "variants.0.cachedStock.onHand": -1 };
      break;
    case "top-rated":
    case "featured":
    default:
      sortOptions = { updatedAt: -1, createdAt: -1 };
      break;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(48, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [rawProducts, total] = await Promise.all([
    Product.find(query)
      .populate("brandId", "name slug")
      .populate("categoryId", "name slug")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Product.countDocuments(query),
  ]);

  let formatted = rawProducts.map(formatProductCard);

  // Post-filter for onSale if requested
  if (onSale === "true" || onSale === true) {
    formatted = formatted.filter((p) => p.discountPercent > 0);
  }

  const result = {
    products: formatted,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch Full Product Details for PDP (/product/[slug])
 */
export async function getProductBySlug(slug) {
  const cacheKey = `product_${slug}`;
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();

  const product = await Product.findOne({ slug, isDeleted: false })
    .populate("categoryId")
    .populate("brandId")
    .populate("collectionIds")
    .lean();

  if (!product) return null;

  // Fetch reviews
  const reviews = await Review.find({
    productId: product._id,
    status: "APPROVED",
  })
    .sort({ createdAt: -1 })
    .lean();

  // Calculate review metrics
  let totalRating = 0;
  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    totalRating += r.rating;
    const rounded = Math.round(r.rating);
    if (ratingDistribution[rounded] !== undefined) {
      ratingDistribution[rounded] += 1;
    }
  });

  const reviewCount = reviews.length;
  const averageRating = reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(1)) : 5.0;

  // Fetch related products (same category or shared tags)
  const relatedRaw = await Product.find({
    _id: { $ne: product._id },
    isDeleted: false,
    status: "PUBLISHED",
    $or: [{ categoryId: product.categoryId?._id }, { tags: { $in: product.tags || [] } }],
  })
    .populate("brandId", "name slug")
    .populate("categoryId", "name slug")
    .limit(4)
    .lean();

  const relatedProducts = relatedRaw.map(formatProductCard);

  const serialized = serializeDoc(product);

  const result = {
    ...serialized,
    reviews: reviews.map(serializeDoc),
    reviewMetrics: {
      averageRating,
      reviewCount,
      ratingDistribution,
    },
    relatedProducts,
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch Category Details & Subcategories
 */
export async function getCategoryBySlug(slug) {
  const cacheKey = `category_${slug}`;
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();
  const category = await Category.findOne({ slug, isActive: true }).lean();
  if (!category) return null;

  const subcategories = await Category.find({ parentId: category._id, isActive: true })
    .sort({ displayOrder: 1 })
    .lean();

  const result = {
    ...serializeDoc(category),
    subcategories: subcategories.map(serializeDoc),
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch Collection Details
 */
export async function getCollectionBySlug(slug) {
  const cacheKey = `collection_${slug}`;
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();
  const collection = await Collection.findOne({ slug, isActive: true, status: "PUBLISHED" })
    .populate("products.product")
    .lean();

  if (!collection) return null;

  const result = serializeDoc(collection);
  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch All Active Collections
 */
export async function getCollections() {
  const cacheKey = "all_collections";
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();
  const rawCollections = await Collection.find({ isActive: true, status: "PUBLISHED" })
    .sort({ isFeatured: -1, createdAt: -1 })
    .lean();

  const result = serializeDoc(rawCollections) || [];
  setCached(cacheKey, result);
  return result;
}

/**
 * Fetch Brand Details
 */
export async function getBrandBySlug(slug) {
  const cacheKey = `brand_${slug}`;
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();
  const brand = await Brand.findOne({ slug, isActive: true }).lean();
  if (!brand) return null;

  const result = serializeDoc(brand);
  setCached(cacheKey, result);
  return result;
}

/**
 * Dynamic Filter Facets for Sidebar & Drawers
 */
export async function getFilterFacets() {
  const cacheKey = "filter_facets";
  const cached = getCached(cacheKey, 60);
  if (cached) return cached;

  await connectToDatabase();

  const [categories, brands, products] = await Promise.all([
    Category.find({ isActive: true }).sort({ displayOrder: 1 }).lean(),
    Brand.find({ isActive: true }).sort({ name: 1 }).lean(),
    Product.find({ isDeleted: false, status: "PUBLISHED" }, { variants: 1, gender: 1 }).lean(),
  ]);

  const colorMap = new Map();
  const sizeSet = new Set();
  let minPrice = Infinity;
  let maxPrice = 0;

  products.forEach((p) => {
    (p.variants || []).forEach((v) => {
      if (v.color?.name && !colorMap.has(v.color.name)) {
        colorMap.set(v.color.name, {
          name: v.color.name,
          hex: v.color.hex,
        });
      }
      if (v.size) sizeSet.add(v.size);
      if (v.price < minPrice) minPrice = v.price;
      if (v.price > maxPrice) maxPrice = v.price;
    });
  });

  const result = {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c.productCount || 0 })),
    brands: brands.map((b) => ({ name: b.name, slug: b.slug })),
    colors: Array.from(colorMap.values()),
    sizes: Array.from(sizeSet),
    genders: ["MEN", "WOMEN", "UNISEX"],
    priceRange: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice === 0 ? 10000 : maxPrice,
    },
  };

  setCached(cacheKey, result);
  return result;
}

/**
 * Instant Search Suggestions Autocomplete
 */
export async function getSearchSuggestions(query) {
  if (!query || !query.trim()) {
    return { products: [], categories: [], popular: ["Oversized Tee", "French Terry Hoodie", "Linen Shirt", "Pleated Trousers"] };
  }

  await connectToDatabase();
  const clean = query.trim();

  const [products, categories] = await Promise.all([
    Product.find(
      {
        isDeleted: false,
        status: "PUBLISHED",
        $or: [
          { title: { $regex: clean, $options: "i" } },
          { tags: { $regex: clean, $options: "i" } },
          { "variants.sku": { $regex: clean, $options: "i" } },
        ],
      },
      { title: 1, slug: 1, primaryImages: 1, "variants.price": 1 }
    )
      .limit(5)
      .lean(),
    Category.find(
      {
        isActive: true,
        name: { $regex: clean, $options: "i" },
      },
      { name: 1, slug: 1 }
    )
      .limit(3)
      .lean(),
  ]);

  return {
    products: products.map((p) => ({
      title: p.title,
      slug: p.slug,
      price: p.variants?.[0]?.price || 0,
      image: p.primaryImages?.[0]?.url || "",
    })),
    categories: categories.map((c) => ({
      name: c.name,
      slug: c.slug,
    })),
    popular: ["Oversized Tee", "French Terry Hoodie", "Linen Shirt", "Pleated Trousers"],
  };
}
