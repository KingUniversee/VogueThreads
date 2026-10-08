import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import { buildRuleQuery } from "@/lib/collection-rules";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { rules = [], ruleMatchMode = "ALL" } = body;

    const query = buildRuleQuery(rules, ruleMatchMode);

    const [count, sampleProducts] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .select("title slug primaryImages variants status categoryId brandId")
        .populate("categoryId", "name slug")
        .populate("brandId", "name slug")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const formattedSample = sampleProducts.map((p) => {
      const prices = (p.variants || []).map((v) => v.price).filter((pr) => typeof pr === "number");
      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        image: p.primaryImages?.[0]?.url || p.variants?.[0]?.images?.[0]?.url || "",
        categoryName: p.categoryId?.name || "Uncategorized",
        brandName: p.brandId?.name || "Originals",
        price: prices.length > 0 ? Math.min(...prices) : 0,
        status: p.status,
      };
    });

    return NextResponse.json({
      success: true,
      count,
      sampleProducts: formattedSample,
    });
  } catch (err) {
    console.error("POST /api/collections/preview-rules error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to preview rules" },
      { status: 500 }
    );
  }
}
