import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request) {
  try {
    await assertPermission(["products.read", "catalog.read", "catalog.manage"]);
    await connectToDatabase();

    const products = await Product.find({ isDeleted: { $ne: true } })
      .populate("category", "name")
      .populate("brand", "name")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Product ID",
      "Title",
      "SKU",
      "Category",
      "Brand",
      "Base Price",
      "Sale Price",
      "Variants Count",
      "Total Stock",
      "Status",
      "Created At",
    ];

    const rows = products.map((p) => {
      const primarySku = p.sku || (p.variants?.[0]?.sku) || "N/A";
      const categoryName = p.category?.name || "Uncategorized";
      const brandName = p.brand?.name || "VogueThreads";
      const variantsCount = p.variants?.length || 0;
      const totalStock = (p.variants || []).reduce(
        (sum, v) => sum + (v.cachedStock || v.stock || 0),
        0
      );

      return [
        escapeCsvField(p._id),
        escapeCsvField(p.title),
        escapeCsvField(primarySku),
        escapeCsvField(categoryName),
        escapeCsvField(brandName),
        escapeCsvField(p.price || 0),
        escapeCsvField(p.compareAtPrice || p.price || 0),
        escapeCsvField(variantsCount),
        escapeCsvField(totalStock),
        escapeCsvField(p.status || "DRAFT"),
        escapeCsvField(p.createdAt ? new Date(p.createdAt).toISOString() : ""),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="voguethreads-products-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/products/export GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export products" },
      { status: error.status || 500 }
    );
  }
}
