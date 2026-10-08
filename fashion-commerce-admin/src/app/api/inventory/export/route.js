import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Inventory from "@/models/Inventory";
import Product from "@/models/Product"; // eslint-disable-line no-unused-vars
import Category from "@/models/Category"; // eslint-disable-line no-unused-vars

export async function GET() {
  try {
    await assertPermission("inventory.read");
    await connectToDatabase();

    const items = await Inventory.find({})
      .sort({ variantSku: 1 })
      .populate({
        path: "productId",
        select: "title categoryId variants",
        populate: { path: "categoryId", select: "name" },
      })
      .lean();

    const headers = [
      "SKU",
      "Product Title",
      "Category",
      "Color",
      "Size",
      "Warehouse Location",
      "On Hand Units",
      "Reserved Units",
      "Available to Sell",
      "Low Stock Threshold",
      "Status",
      "Last Updated",
    ];

    const escapeCsv = (val) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = items.map((inv) => {
      const product = inv.productId || {};
      const variant = (product.variants || []).find(
        (v) => v.sku?.toUpperCase() === inv.variantSku?.toUpperCase()
      ) || {};

      let status = "IN_STOCK";
      const thresh = inv.lowStockThreshold ?? 5;
      if (inv.available <= 0) {
        status = "OUT_OF_STOCK";
      } else if (inv.available <= thresh) {
        status = "LOW_STOCK";
      }

      return [
        escapeCsv(inv.variantSku),
        escapeCsv(product.title || "Apparel Item"),
        escapeCsv(product.categoryId?.name || "Apparel"),
        escapeCsv(variant.color?.name || "Default"),
        escapeCsv(variant.size || "M"),
        escapeCsv(inv.warehouseLocation || "Main Warehouse"),
        inv.onHand ?? 0,
        inv.reserved ?? 0,
        inv.available ?? 0,
        thresh,
        status,
        inv.updatedAt ? new Date(inv.updatedAt).toISOString() : "",
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="voguethreads-inventory-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    console.error("GET /api/inventory/export error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to export inventory" },
      { status }
    );
  }
}
