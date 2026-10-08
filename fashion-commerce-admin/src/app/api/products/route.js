import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Collection from "@/models/Collection";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req) {
  try {
    await assertPermission("products.read");
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const categoryId = searchParams.get("category");
    const brandId = searchParams.get("brand");
    const collectionId = searchParams.get("collection");
    const status = searchParams.get("status");
    const stockStatus = searchParams.get("stockStatus");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "recent";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    const filter = { isDeleted: false };

    // 1. Status Filter
    if (status && status !== "ALL") {
      const upperStatus = status.toUpperCase();
      if (["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(upperStatus)) {
        filter.status = upperStatus;
      }
    }

    // 2. Category Filter
    if (categoryId && categoryId !== "ALL") {
      filter.categoryId = categoryId;
    }

    // 3. Brand Filter
    if (brandId && brandId !== "ALL") {
      filter.brandId = brandId;
    }

    // 4. Collection Filter
    if (collectionId && collectionId !== "ALL") {
      filter.collectionIds = collectionId;
    }

    // 5. Text Search (Product Name, SKU, Slug)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { "variants.sku": { $regex: search, $options: "i" } },
      ];
    }

    // 6. Price Range Filter
    if (minPrice || maxPrice) {
      filter["variants.price"] = {};
      if (minPrice) filter["variants.price"].$gte = Number(minPrice);
      if (maxPrice) filter["variants.price"].$lte = Number(maxPrice);
    }

    // 7. Sorting
    let sortOptions = { updatedAt: -1 };
    switch (sort) {
      case "newest":
        sortOptions = { createdAt: -1 };
        break;
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "name_asc":
        sortOptions = { title: 1 };
        break;
      case "name_desc":
        sortOptions = { title: -1 };
        break;
      case "price_asc":
        sortOptions = { "variants.0.price": 1 };
        break;
      case "price_desc":
        sortOptions = { "variants.0.price": -1 };
        break;
      case "recent":
      default:
        sortOptions = { updatedAt: -1 };
        break;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("categoryId", "name slug")
        .populate("brandId", "name slug")
        .populate("collectionIds", "name slug")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Attach aggregated live inventory stock per product
    const productIds = products.map((p) => p._id);
    const inventories = await Inventory.find({ productId: { $in: productIds } }).lean();

    const inventoryByProduct = {};
    inventories.forEach((inv) => {
      const pId = String(inv.productId);
      if (!inventoryByProduct[pId]) {
        inventoryByProduct[pId] = { available: 0, onHand: 0, reserved: 0, lowStockCount: 0 };
      }
      inventoryByProduct[pId].available += inv.available || 0;
      inventoryByProduct[pId].onHand += inv.onHand || 0;
      inventoryByProduct[pId].reserved += inv.reserved || 0;
      if ((inv.available || 0) <= (inv.lowStockThreshold || 5)) {
        inventoryByProduct[pId].lowStockCount += 1;
      }
    });

    const formattedProducts = products.map((p) => {
      const invSummary = inventoryByProduct[String(p._id)] || {
        available: 0,
        onHand: 0,
        reserved: 0,
        lowStockCount: 0,
      };

      const prices = (p.variants || []).map((v) => v.price).filter((pr) => typeof pr === "number");
      const minP = prices.length > 0 ? Math.min(...prices) : 0;
      const maxP = prices.length > 0 ? Math.max(...prices) : 0;

      let computedStockStatus = "OUT_OF_STOCK";
      if (invSummary.available > 0) {
        computedStockStatus = invSummary.lowStockCount > 0 ? "LOW_STOCK" : "IN_STOCK";
      }

      // Collect distinct colors and sizes for quick merchandising overview
      const distinctColors = [
        ...new Set((p.variants || []).map((v) => v.color?.name).filter(Boolean)),
      ];
      const distinctSizes = [
        ...new Set((p.variants || []).map((v) => v.size).filter(Boolean)),
      ];

      return {
        id: String(p._id),
        title: p.title,
        slug: p.slug,
        status: p.status,
        publishAt: p.publishAt,
        category: p.categoryId ? { id: p.categoryId._id, name: p.categoryId.name } : null,
        brand: p.brandId ? { id: p.brandId._id, name: p.brandId.name } : null,
        collections: (p.collectionIds || []).map((c) => ({ id: c._id, name: c.name })),
        primaryImage: p.primaryImages?.[0]?.url || p.variants?.[0]?.images?.[0]?.url || null,
        baseSku: p.variants?.[0]?.sku || "NO-SKU",
        variantsCount: (p.variants || []).length,
        colorsCount: distinctColors.length,
        sizesCount: distinctSizes.length,
        distinctColors,
        distinctSizes,
        priceMin: minP,
        priceMax: maxP,
        priceDisplay: minP === maxP ? minP : `${minP} - ${maxP}`,
        stock: {
          available: invSummary.available,
          onHand: invSummary.onHand,
          reserved: invSummary.reserved,
          status: computedStockStatus,
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    // If stockStatus filter was specified, filter the formatted list if required
    let resultItems = formattedProducts;
    if (stockStatus && stockStatus !== "ALL") {
      resultItems = formattedProducts.filter((p) => p.stock.status === stockStatus);
    }

    return NextResponse.json({
      success: true,
      data: resultItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("GET /api/products error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch products" },
      { status }
    );
  }
}

export async function POST(req) {
  try {
    const user = await assertPermission("products.create");
    await connectToDatabase();

    const body = await req.json();
    const {
      title,
      slug,
      description,
      shortDescription,
      categoryId,
      brandId,
      collectionIds,
      gender,
      hsnCode,
      gstRate,
      status,
      publishAt,
      primaryImages,
      variants,
      attributes,
      careInstructions,
      tags,
    } = body;

    // 1. Mandatory Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Product title is required" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Product category is required" },
        { status: 400 }
      );
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one clothing variant must be enabled" },
        { status: 400 }
      );
    }

    // 2. Validate Status (DRAFT, SCHEDULED, PUBLISHED, ARCHIVED only - NO ACTIVE)
    const validStatuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
    const productStatus = status && validStatuses.includes(status.toUpperCase())
      ? status.toUpperCase()
      : "DRAFT";

    // 3. Slugify
    const cleanSlug = (slug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existingSlug = await Product.findOne({ slug: cleanSlug });
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: `Product with slug '${cleanSlug}' already exists` },
        { status: 400 }
      );
    }

    // 4. Validate Variant Matrix and SKUs
    const skuSet = new Set();
    const formattedVariants = [];

    for (const v of variants) {
      if (!v.sku || !v.sku.trim()) {
        return NextResponse.json(
          { success: false, error: "Every enabled variant must have a valid SKU" },
          { status: 400 }
        );
      }

      const upperSku = v.sku.trim().toUpperCase();

      if (skuSet.has(upperSku)) {
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate SKU '${upperSku}' within variant list. Each variant SKU must be unique.`,
          },
          { status: 400 }
        );
      }
      skuSet.add(upperSku);

      // Check global database SKU uniqueness
      const existingProductWithSku = await Product.findOne({ "variants.sku": upperSku });
      if (existingProductWithSku) {
        return NextResponse.json(
          {
            success: false,
            error: `SKU '${upperSku}' is already in use by product '${existingProductWithSku.title}'`,
          },
          { status: 400 }
        );
      }

      const existingInv = await Inventory.findOne({ variantSku: upperSku });
      if (existingInv) {
        return NextResponse.json(
          {
            success: false,
            error: `SKU '${upperSku}' already exists in warehouse inventory`,
          },
          { status: 400 }
        );
      }

      const variantPrice = Number(v.price) || 0;
      if (variantPrice < 0) {
        return NextResponse.json(
          { success: false, error: `Price for variant '${upperSku}' cannot be negative` },
          { status: 400 }
        );
      }

      formattedVariants.push({
        variantId: v.variantId || `var_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sku: upperSku,
        barcode: v.barcode ? String(v.barcode).trim() : undefined,
        color: {
          name: v.color?.name || "Default",
          hex: v.color?.hex || "#000000",
          code: v.color?.code || "",
        },
        size: v.size || "M",
        price: variantPrice,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
        costPrice: v.costPrice ? Number(v.costPrice) : undefined,
        weightGrams: Number(v.weightGrams) || 300,
        images: Array.isArray(v.images) ? v.images : [],
        availability: v.availability || "IN_STOCK",
        isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
      });
    }

    // 5. Create Product in MongoDB
    const product = await Product.create({
      title: title.trim(),
      slug: cleanSlug,
      description: description || "",
      shortDescription: shortDescription || "",
      categoryId,
      brandId: brandId || null,
      collectionIds: Array.isArray(collectionIds) ? collectionIds : [],
      gender: gender || "UNISEX",
      hsnCode: hsnCode || "6109",
      gstRate: Number(gstRate) || 5,
      status: productStatus,
      publishAt: productStatus === "SCHEDULED" && publishAt ? new Date(publishAt) : null,
      primaryImages: Array.isArray(primaryImages) ? primaryImages : [],
      variants: formattedVariants,
      attributes: Array.isArray(attributes) ? attributes : [],
      careInstructions: Array.isArray(careInstructions) ? careInstructions : [],
      tags: Array.isArray(tags) ? tags : [],
    });

    // 6. Synchronize Inventory Records for Each Variant
    // Inventory is single source of truth for stock quantities: initialized to 0
    await Promise.all(
      formattedVariants.map((v) =>
        Inventory.create({
          variantSku: v.sku,
          productId: product._id,
          variantId: v.variantId,
          onHand: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: 5,
        })
      )
    );

    // 7. Create Audit Log
    try {
      await AuditLog.create({
        actorId: user.id,
        actorEmail: user.email,
        action: "PRODUCT_CREATE",
        resource: "Product",
        resourceId: String(product._id),
        details: {
          title: product.title,
          slug: product.slug,
          status: product.status,
          variantsCount: formattedVariants.length,
          skus: formattedVariants.map((v) => v.sku),
        },
      });
    } catch (auditErr) {
      console.warn("⚠️ [AuditLog] Error recording product creation:", auditErr.message);
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create product" },
      { status }
    );
  }
}
