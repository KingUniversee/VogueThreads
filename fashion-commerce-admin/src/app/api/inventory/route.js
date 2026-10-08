import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Inventory from "@/models/Inventory";
import Product from "@/models/Product";
import Category from "@/models/Category"; // eslint-disable-line no-unused-vars
import {
  ensureInventoryForVariants,
  getInventoryMetrics,
} from "@/lib/inventory-service";
import {
  getInventoryStatus,
  getCanonicalThreshold,
  calculateAvailableStock,
} from "@/lib/inventory-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await assertPermission("inventory.read");
    await connectToDatabase();

    // Self-healing: ensure any existing product variants have inventory records
    await ensureInventoryForVariants();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "ALL").toUpperCase();
    const categoryId = (searchParams.get("categoryId") || "").trim();
    const warehouse = (searchParams.get("warehouse") || "").trim();
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build base filter
    const query = {};

    if (warehouse && warehouse !== "ALL") {
      query.warehouseLocation = warehouse;
    }

    // Status filter
    if (status === "OUT_OF_STOCK") {
      query.available = { $lte: 0 };
    } else if (status === "LOW_STOCK") {
      query.$expr = {
        $and: [
          { $gt: ["$available", 0] },
          { $lte: ["$available", "$lowStockThreshold"] },
        ],
      };
    } else if (status === "IN_STOCK") {
      query.$expr = { $gt: ["$available", "$lowStockThreshold"] };
    }

    // If searching or filtering by category, find relevant product IDs first
    if (search || (categoryId && categoryId !== "ALL")) {
      const productQuery = { isDeleted: { $ne: true } };

      if (categoryId && categoryId !== "ALL") {
        productQuery.categoryId = categoryId;
      }

      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        productQuery.$or = [
          { title: regex },
          { "variants.sku": regex },
          { "variants.barcode": regex },
          { "variants.color.name": regex },
          { "variants.size": regex },
        ];
      }

      const matchingProducts = await Product.find(productQuery).select("_id variants").lean();
      const matchingProductIds = matchingProducts.map((p) => p._id);

      if (search) {
        const upperSearch = search.toUpperCase();
        query.$or = [
          { variantSku: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
          { productId: { $in: matchingProductIds } },
        ];
      } else {
        query.productId = { $in: matchingProductIds };
      }
    }

    // Total matching records
    const total = await Inventory.countDocuments(query);

    // Sorting definition
    let sortObj = {};
    if (sortBy === "sku" || sortBy === "variantSku") {
      sortObj = { variantSku: sortOrder };
    } else if (sortBy === "onHand") {
      sortObj = { onHand: sortOrder };
    } else if (sortBy === "reserved") {
      sortObj = { reserved: sortOrder };
    } else if (sortBy === "available") {
      sortObj = { available: sortOrder };
    } else {
      sortObj = { updatedAt: sortOrder, _id: sortOrder };
    }

    const inventoryDocs = await Inventory.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "productId",
        select: "title slug categoryId primaryImages variants isDeleted status gender",
        populate: { path: "categoryId", select: "name slug" },
      })
      .lean();

    // Map each inventory document with full apparel variant details
    const items = inventoryDocs.map((inv) => {
      const product = inv.productId || {};
      const variant = (product.variants || []).find(
        (v) => v.sku?.toUpperCase() === inv.variantSku?.toUpperCase()
      ) || {};

      const thresh = getCanonicalThreshold(inv);
      const available =
        typeof inv.available === "number"
          ? inv.available
          : calculateAvailableStock(inv.onHand, inv.reserved);
      const computedStatus = getInventoryStatus(available, thresh);

      // Find best image
      const primaryImage =
        variant.images?.find((img) => img.isPrimary)?.url ||
        variant.images?.[0]?.url ||
        product.primaryImages?.[0]?.url ||
        null;

      return {
        _id: inv._id,
        variantSku: inv.variantSku,
        productId: product._id || inv.productId,
        productTitle: product.title || "Apparel Item",
        productSlug: product.slug || "",
        productStatus: product.status || "DRAFT",
        gender: product.gender || "UNISEX",
        category: product.categoryId?.name || "General Apparel",
        categoryId: product.categoryId?._id || product.categoryId,
        variantId: inv.variantId || variant.variantId,
        color: variant.color || { name: "Default", hex: "#000000" },
        size: variant.size || "M",
        price: variant.price ?? 0,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        barcode: variant.barcode || "",
        image: primaryImage,
        onHand: inv.onHand ?? 0,
        reserved: inv.reserved ?? 0,
        available,
        soldCount: inv.soldCount ?? 0,
        lowStockThreshold: thresh,
        threshold: thresh,
        allowBackorder: Boolean(inv.allowBackorder),
        warehouseLocation: inv.warehouseLocation || "Main Warehouse",
        status: computedStatus,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      };
    });

    // Get live aggregate summary
    const summary = await getInventoryMetrics();

    return NextResponse.json(
      {
        success: true,
        data: items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
        summary,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/inventory error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load inventory" },
      { status }
    );
  }
}
