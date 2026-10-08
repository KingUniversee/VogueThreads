import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Category from "@/models/Category";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const statusParam = searchParams.get("status");
    const hierarchy = searchParams.get("hierarchy") || "ALL";
    const allParam = searchParams.get("all") === "true";

    const filter = {};

    // Status filter
    if (statusParam === "ACTIVE") {
      filter.isActive = true;
    } else if (statusParam === "INACTIVE") {
      filter.isActive = false;
    } else if (statusParam === "ALL" || allParam) {
      // Include both active and inactive
    } else {
      // Default behavior for consumer selectors: active only
      filter.isActive = true;
    }

    // Hierarchy filter
    if (hierarchy === "ROOT") {
      filter.parentId = null;
    } else if (hierarchy === "CHILD") {
      filter.parentId = { $ne: null };
    }

    // Search query
    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ];
    }

    const categories = await Category.find(filter)
      .populate("parentId", "name slug")
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Dynamically compute real live product counts from MongoDB Product collection
    const productCounts = await Product.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    for (const item of productCounts) {
      if (item._id) {
        countMap[String(item._id)] = item.count;
      }
    }

    const data = categories.map((cat) => ({
      ...cat,
      productCount: countMap[String(cat._id)] || 0,
    }));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (err) {
    console.error("GET /api/categories error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await assertPermission("categories.manage");
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      slug,
      description,
      parentId,
      imageUrl,
      isActive,
      displayOrder,
      seo,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Category name is required" },
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

    const existing = await Category.findOne({ slug: cleanSlug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Category with slug '${cleanSlug}' already exists` },
        { status: 400 }
      );
    }

    let level = 0;
    let validParentId = null;

    if (parentId && parentId !== "null" && parentId !== "") {
      const parentDoc = await Category.findById(parentId);
      if (!parentDoc) {
        return NextResponse.json(
          { success: false, error: "Selected parent category does not exist" },
          { status: 400 }
        );
      }
      validParentId = parentDoc._id;
      level = (parentDoc.level || 0) + 1;
    }

    const category = await Category.create({
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : "",
      parentId: validParentId,
      level,
      imageUrl: imageUrl ? imageUrl.trim() : "",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: Number(displayOrder) || 0,
      seo: {
        metaTitle: seo?.metaTitle ? seo.metaTitle.trim() : "",
        metaDescription: seo?.metaDescription ? seo.metaDescription.trim() : "",
      },
    });

    // Write Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "CATEGORY_CREATE",
        resource: "Category",
        resourceId: String(category._id),
        details: {
          after: {
            name: category.name,
            slug: category.slug,
            parentId: category.parentId,
            level: category.level,
            isActive: category.isActive,
            displayOrder: category.displayOrder,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record category create audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err) {
    console.error("POST /api/categories error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create category" },
      { status }
    );
  }
}
