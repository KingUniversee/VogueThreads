import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import InventoryTransaction from "@/models/InventoryTransaction";
import Product from "@/models/Product"; // eslint-disable-line no-unused-vars

export async function GET(req) {
  try {
    await assertPermission("inventory.read");
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sku = (searchParams.get("sku") || "").trim().toUpperCase();
    const type = (searchParams.get("type") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const query = {};

    if (sku) {
      query.variantSku = sku;
    }

    if (type && type !== "ALL") {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { variantSku: regex },
        { reason: regex },
        { referenceId: regex },
        { actorEmail: regex },
        { notes: regex },
      ];
    }

    const total = await InventoryTransaction.countDocuments(query);

    const transactions = await InventoryTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("productId", "title slug primaryImages variants")
      .lean();

    // Map each transaction with rich product & variant context
    const items = transactions.map((tx) => {
      const product = tx.productId || {};
      const variant = (product.variants || []).find(
        (v) => v.sku?.toUpperCase() === tx.variantSku?.toUpperCase()
      ) || {};

      const image =
        variant.images?.find((img) => img.isPrimary)?.url ||
        variant.images?.[0]?.url ||
        product.primaryImages?.[0]?.url ||
        null;

      return {
        _id: tx._id,
        variantSku: tx.variantSku,
        productId: product._id || tx.productId,
        productTitle: product.title || "Apparel Item",
        productSlug: product.slug || "",
        variantColor: variant.color || { name: "Default", hex: "#000000" },
        variantSize: variant.size || "M",
        image,
        type: tx.type,
        delta: tx.delta,
        quantityChange: tx.quantityChange ?? tx.delta,
        previousQuantity: tx.previousQuantity ?? (tx.previousOnHand ?? tx.previousAvailable ?? 0),
        newQuantity: tx.newQuantity ?? (tx.newOnHand ?? tx.newAvailable ?? 0),
        previousOnHand: tx.previousOnHand ?? (tx.previousAvailable || 0),
        newOnHand: tx.newOnHand ?? (tx.newAvailable || 0),
        previousAvailable: tx.previousAvailable,
        newAvailable: tx.newAvailable,
        reason: tx.reason,
        referenceId: tx.referenceId || "—",
        actorEmail: tx.actorEmail,
        notes: tx.notes || "",
        createdAt: tx.createdAt,
      };
    });

    // Summary statistics for adjustment ledger
    const totalAddedAgg = await InventoryTransaction.aggregate([
      { $match: { delta: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$delta" } } },
    ]);
    const totalDeductedAgg = await InventoryTransaction.aggregate([
      { $match: { delta: { $lt: 0 } } },
      { $group: { _id: null, total: { $sum: "$delta" } } },
    ]);

    const stats = {
      totalTransactions: total,
      totalUnitsAdded: totalAddedAgg[0]?.total || 0,
      totalUnitsDeducted: Math.abs(totalDeductedAgg[0]?.total || 0),
    };

    return NextResponse.json({
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
      stats,
    });
  } catch (err) {
    console.error("GET /api/inventory/adjustments error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch adjustment history" },
      { status }
    );
  }
}
