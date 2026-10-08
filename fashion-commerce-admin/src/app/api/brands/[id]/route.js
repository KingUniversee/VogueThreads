import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const brand = await Brand.findById(id).lean();

    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    const [productCount, sampleProducts] = await Promise.all([
      Product.countDocuments({ brandId: id, isDeleted: { $ne: true } }),
      Product.find({ brandId: id, isDeleted: { $ne: true } })
        .select("title slug primaryImages variants status categoryId")
        .populate("categoryId", "name slug")
        .sort({ createdAt: -1 })
        .limit(10)
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
        price: prices.length > 0 ? Math.min(...prices) : 0,
        status: p.status,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...brand,
        productCount,
        sampleProducts: formattedSample,
      },
    });
  } catch (err) {
    console.error(`GET /api/brands/[id] error:`, err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch brand" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await assertPermission("brands.manage");
    await connectToDatabase();
    const { id } = await params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    const beforeState = brand.toObject();
    const body = await req.json();
    const {
      name,
      slug,
      description,
      logoUrl,
      coverImageUrl,
      website,
      isActive,
      seo,
    } = body;

    // 1. Slug validation
    if (slug || name) {
      const cleanSlug = (slug || name || brand.slug)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!cleanSlug) {
        return NextResponse.json(
          { success: false, error: "Valid URL slug could not be generated" },
          { status: 400 }
        );
      }

      const existing = await Brand.findOne({
        slug: cleanSlug,
        _id: { $ne: brand._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Brand with slug '${cleanSlug}' already exists` },
          { status: 400 }
        );
      }

      brand.slug = cleanSlug;
    }

    if (name && name.trim()) brand.name = name.trim();
    if (description !== undefined) brand.description = description ? description.trim() : "";
    if (logoUrl !== undefined) brand.logoUrl = logoUrl ? logoUrl.trim() : "";
    if (coverImageUrl !== undefined) brand.coverImageUrl = coverImageUrl ? coverImageUrl.trim() : "";
    if (website !== undefined) brand.website = website ? website.trim() : "";
    if (isActive !== undefined) brand.isActive = Boolean(isActive);

    if (seo) {
      brand.seo = {
        metaTitle: seo.metaTitle !== undefined ? seo.metaTitle.trim() : (brand.seo?.metaTitle || ""),
        metaDescription:
          seo.metaDescription !== undefined
            ? seo.metaDescription.trim()
            : (brand.seo?.metaDescription || ""),
      };
    }

    brand.updatedBy = user.email;
    await brand.save();

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "BRAND_UPDATE",
        resource: "Brand",
        resourceId: String(brand._id),
        details: {
          before: {
            name: beforeState.name,
            slug: beforeState.slug,
            isActive: beforeState.isActive,
            website: beforeState.website,
          },
          after: {
            name: brand.name,
            slug: brand.slug,
            isActive: brand.isActive,
            website: brand.website,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record brand update audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: brand });
  } catch (err) {
    console.error(`PATCH /api/brands/[id] error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update brand" },
      { status }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await assertPermission("brands.manage");
    await connectToDatabase();
    const { id } = await params;

    const brand = await Brand.findById(id);
    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    // Safe Deletion Guard: Check if products reference this brand
    const productCount = await Product.countDocuments({
      brandId: id,
      isDeleted: { $ne: true },
    });

    if (productCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete brand: it is currently assigned to ${productCount} active product(s). Please archive or reassign products first.`,
        },
        { status: 400 }
      );
    }

    const deletedDoc = await Brand.findByIdAndDelete(id);

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "BRAND_DELETE",
        resource: "Brand",
        resourceId: String(id),
        details: {
          before: {
            name: deletedDoc.name,
            slug: deletedDoc.slug,
            isActive: deletedDoc.isActive,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record brand delete audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (err) {
    console.error(`DELETE /api/brands/[id] error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete brand" },
      { status }
    );
  }
}
