import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Inventory from "@/models/Inventory";
import Product from "@/models/Product"; // eslint-disable-line no-unused-vars
import {
  ensureInventoryForVariants,
  getInventoryMetrics,
} from "@/lib/inventory-service";
import {
  getCanonicalThreshold,
  calculateAvailableStock,
  getUrgencyLevel,
  isSafetyAlert,
} from "@/lib/inventory-status";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    await assertPermission("inventory.read");
    await connectToDatabase();

    await ensureInventoryForVariants();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const filter = (searchParams.get("filter") || "ALL").toUpperCase();
    const search = (searchParams.get("search") || "").trim();

    // Base query: ONLY variants at or below safety threshold (available <= lowStockThreshold)
    let query = {
      $expr: { $lte: ["$available", "$lowStockThreshold"] },
    };

    if (filter === "OUT_OF_STOCK") {
      query = { available: { $lte: 0 } };
    } else if (filter === "CRITICAL") {
      query = {
        $expr: {
          $and: [
            { $gt: ["$available", 0] },
            { $lte: ["$available", 2] },
            { $lte: ["$available", "$lowStockThreshold"] },
          ],
        },
      };
    } else if (filter === "LOW") {
      query = {
        $expr: {
          $and: [
            { $gt: ["$available", 0] },
            { $lte: ["$available", "$lowStockThreshold"] },
          ],
        },
      };
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matchingProducts = await Product.find({
        isDeleted: { $ne: true },
        $or: [{ title: regex }, { "variants.sku": regex }],
      })
        .select("_id")
        .lean();

      const pIds = matchingProducts.map((p) => p._id);
      query.$or = [{ variantSku: regex }, { productId: { $in: pIds } }];
    }

    const total = await Inventory.countDocuments(query);

    const docs = await Inventory.find(query)
      .sort({ available: 1, onHand: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "productId",
        select: "title slug categoryId primaryImages variants isDeleted",
        populate: { path: "categoryId", select: "name" },
      })
      .lean();

    const items = docs
      .map((inv) => {
        const product = inv.productId || {};
        const variant = (product.variants || []).find(
          (v) => v.sku?.toUpperCase() === inv.variantSku?.toUpperCase()
        ) || {};

        const threshold = getCanonicalThreshold(inv);
        const available =
          typeof inv.available === "number"
            ? inv.available
            : calculateAvailableStock(inv.onHand, inv.reserved);

        const urgency = getUrgencyLevel(available, threshold);

        // Reorder recommendation: replenish to 3x safety threshold
        const suggestedReorder = Math.max(10, threshold * 3 - Math.max(0, available));

        const image =
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
          category: product.categoryId?.name || "General Apparel",
          color: variant.color || { name: "Default", hex: "#000000" },
          size: variant.size || "M",
          price: variant.price ?? 0,
          costPrice: variant.costPrice,
          image,
          onHand: inv.onHand ?? 0,
          reserved: inv.reserved ?? 0,
          available,
          threshold,
          lowStockThreshold: threshold,
          urgency,
          suggestedReorder,
          warehouseLocation: inv.warehouseLocation || "Main Warehouse",
          updatedAt: inv.updatedAt,
        };
      })
      // Strictly enforce that only variants at or below threshold are in low stock feed
      .filter((item) => isSafetyAlert(item.available, item.threshold));

    // Live metrics from single source of truth aggregation
    const metrics = await getInventoryMetrics();

    const response = NextResponse.json(
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
        metrics: {
          totalAlerts: metrics.totalAlerts ?? 0,
          outOfStock: metrics.outOfStockCount ?? 0,
          critical: metrics.criticalCount ?? 0,
          lowStock: metrics.lowStockCount ?? 0,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    return response;
  } catch (err) {
    console.error("GET /api/inventory/low-stock error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch low stock alerts" },
      {
        status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  }
}
