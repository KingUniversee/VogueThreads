import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const statusParam = searchParams.get("status");
    const sortParam = searchParams.get("sort") || "recently_updated";
    const allParam = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    const filter = {};

    // Consumer backwards compatibility: if no query params and not requesting pagination, return active brands list
    if (!statusParam && !query && !allParam && !searchParams.has("page")) {
      filter.isActive = true;
      const brands = await Brand.find(filter).sort({ name: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: brands,
        count: brands.length,
      });
    }

    // Status filter
    if (statusParam === "ACTIVE") {
      filter.isActive = true;
    } else if (statusParam === "INACTIVE") {
      filter.isActive = false;
    }

    // Search query
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ];
    }

    // Sort mapping
    let sortObj = { updatedAt: -1 };
    switch (sortParam) {
      case "name_asc":
        sortObj = { name: 1 };
        break;
      case "name_desc":
        sortObj = { name: -1 };
        break;
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "recently_updated":
      default:
        sortObj = { updatedAt: -1 };
        break;
    }

    // Compute real MongoDB brand telemetry counts
    const [totalBrands, activeCount, inactiveCount] = await Promise.all([
      Brand.countDocuments(),
      Brand.countDocuments({ isActive: true }),
      Brand.countDocuments({ isActive: false }),
    ]);

    const totalFiltered = await Brand.countDocuments(filter);
    const skip = (page - 1) * limit;

    const brands = await Brand.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Dynamically compute real live product counts from MongoDB Product collection
    const productCounts = await Product.aggregate([
      { $match: { isDeleted: { $ne: true }, brandId: { $ne: null } } },
      { $group: { _id: "$brandId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    for (const item of productCounts) {
      if (item._id) {
        countMap[String(item._id)] = item.count;
      }
    }

    const dataWithCounts = brands.map((b) => ({
      ...b,
      productCount: countMap[String(b._id)] || 0,
    }));

    return NextResponse.json({
      success: true,
      data: dataWithCounts,
      stats: {
        total: totalBrands,
        active: activeCount,
        inactive: inactiveCount,
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
    });
  } catch (err) {
    console.error("GET /api/brands error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await assertPermission("brands.manage");
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      slug,
      description,
      logoUrl,
      coverImageUrl,
      website,
      isActive = true,
      seo,
    } = body;

    // 1. Mandatory Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Brand name is required" },
        { status: 400 }
      );
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      return NextResponse.json(
        { success: false, error: "Valid URL slug could not be generated" },
        { status: 400 }
      );
    }

    const existing = await Brand.findOne({ slug: cleanSlug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Brand with slug '${cleanSlug}' already exists` },
        { status: 400 }
      );
    }

    // 2. Create Brand Document
    const brand = await Brand.create({
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : "",
      logoUrl: logoUrl ? logoUrl.trim() : "",
      coverImageUrl: coverImageUrl ? coverImageUrl.trim() : "",
      website: website ? website.trim() : "",
      isActive: Boolean(isActive),
      seo: {
        metaTitle: seo?.metaTitle ? seo.metaTitle.trim() : "",
        metaDescription: seo?.metaDescription ? seo.metaDescription.trim() : "",
      },
      createdBy: user.email,
      updatedBy: user.email,
    });

    // 3. Write Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "BRAND_CREATE",
        resource: "Brand",
        resourceId: String(brand._id),
        details: {
          after: {
            name: brand.name,
            slug: brand.slug,
            isActive: brand.isActive,
            website: brand.website,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write brand create audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (err) {
    console.error("POST /api/brands error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create brand" },
      { status }
    );
  }
}
