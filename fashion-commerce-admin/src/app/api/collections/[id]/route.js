import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Collection from "@/models/Collection";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";
import { resolveCollectionProducts, countCollectionProducts } from "@/lib/collection-rules";

export async function GET(req, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const collection = await Collection.findById(id).lean();

    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    const [resolvedProducts, productCount] = await Promise.all([
      resolveCollectionProducts(collection, { limit: 100 }),
      countCollectionProducts(collection),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...collection,
        resolvedProducts,
        productCount,
      },
    });
  } catch (err) {
    console.error(`GET /api/collections/[id] error:`, err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await assertPermission("collections.manage");
    await connectToDatabase();
    const { id } = await params;

    const collection = await Collection.findById(id);
    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    const beforeState = collection.toObject();
    const body = await req.json();
    const {
      name,
      slug,
      description,
      imageUrl,
      bannerUrl,
      type,
      products,
      rules,
      ruleMatchMode,
      status,
      isActive,
      isFeatured,
      publishAt,
      unpublishAt,
      seo,
    } = body;

    // 1. Slug validation
    if (slug || name) {
      const cleanSlug = (slug || name || collection.slug)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!cleanSlug) {
        return NextResponse.json(
          { success: false, error: "Valid URL slug could not be generated" },
          { status: 400 }
        );
      }

      const existing = await Collection.findOne({
        slug: cleanSlug,
        _id: { $ne: collection._id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: `Collection with slug '${cleanSlug}' already exists` },
          { status: 400 }
        );
      }

      collection.slug = cleanSlug;
    }

    if (name && name.trim()) collection.name = name.trim();
    if (description !== undefined) collection.description = description ? description.trim() : "";
    if (imageUrl !== undefined) collection.imageUrl = imageUrl ? imageUrl.trim() : "";
    if (bannerUrl !== undefined) collection.bannerUrl = bannerUrl ? bannerUrl.trim() : "";
    if (type) collection.type = type === "RULE_BASED" ? "RULE_BASED" : "MANUAL";
    if (ruleMatchMode) collection.ruleMatchMode = ruleMatchMode === "ANY" ? "ANY" : "ALL";
    if (isActive !== undefined) collection.isActive = Boolean(isActive);
    if (isFeatured !== undefined) collection.isFeatured = Boolean(isFeatured);

    // Scheduling & Status
    if (publishAt !== undefined) {
      collection.publishAt = publishAt ? new Date(publishAt) : null;
    }
    if (unpublishAt !== undefined) {
      collection.unpublishAt = unpublishAt ? new Date(unpublishAt) : null;
    }
    if (status) {
      let finalStatus = status;
      if (collection.publishAt && collection.publishAt > new Date() && status !== "DRAFT" && status !== "ARCHIVED") {
        finalStatus = "SCHEDULED";
      }
      collection.status = finalStatus;
    }

    if (seo) {
      collection.seo = {
        metaTitle: seo.metaTitle !== undefined ? seo.metaTitle.trim() : (collection.seo?.metaTitle || ""),
        metaDescription:
          seo.metaDescription !== undefined
            ? seo.metaDescription.trim()
            : (collection.seo?.metaDescription || ""),
      };
    }

    // Rules update
    if (rules !== undefined && Array.isArray(rules)) {
      collection.rules = rules.map((r) => ({
        field: r.field,
        operator: r.operator || "EQUALS",
        value: String(r.value || "").trim(),
      })).filter((r) => r.field && r.value !== "");
    }

    // Manual Products update & product sync
    let oldProductIds = (collection.products || []).map((p) => String(p.product));
    let newProductIds = [];

    if (products !== undefined && Array.isArray(products)) {
      collection.products = products.map((item, index) => ({
        product: item.product?._id || item.product,
        position: item.position !== undefined ? Number(item.position) : index,
      })).filter((item) => Boolean(item.product));

      newProductIds = collection.products.map((p) => String(p.product));
    }

    await collection.save();

    // Sync Product.collectionIds
    if (collection.type === "MANUAL" && products !== undefined) {
      const removedIds = oldProductIds.filter((id) => !newProductIds.includes(id));
      const addedIds = newProductIds.filter((id) => !oldProductIds.includes(id));

      try {
        if (removedIds.length > 0) {
          await Product.updateMany(
            { _id: { $in: removedIds } },
            { $pull: { collectionIds: collection._id } }
          );
        }
        if (addedIds.length > 0) {
          await Product.updateMany(
            { _id: { $in: addedIds } },
            { $addToSet: { collectionIds: collection._id } }
          );
        }
      } catch (syncErr) {
        console.warn("Failed to sync Product collectionIds on collection patch:", syncErr);
      }
    }

    collection.updatedBy = user.email;
    await collection.save();

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "COLLECTION_UPDATE",
        resource: "Collection",
        resourceId: String(collection._id),
        details: {
          before: {
            name: beforeState.name,
            slug: beforeState.slug,
            type: beforeState.type,
            status: beforeState.status,
            productsCount: beforeState.products?.length || 0,
          },
          after: {
            name: collection.name,
            slug: collection.slug,
            type: collection.type,
            status: collection.status,
            productsCount: collection.products?.length || 0,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record collection update audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: collection });
  } catch (err) {
    console.error(`PATCH /api/collections/[id] error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update collection" },
      { status }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await assertPermission("collections.manage");
    await connectToDatabase();
    const { id } = await params;

    const collection = await Collection.findById(id);
    if (!collection) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    // Safe unlinking: Unlink collection from any referencing products
    // Deleting a collection NEVER deletes products!
    try {
      await Product.updateMany(
        { collectionIds: collection._id },
        { $pull: { collectionIds: collection._id } }
      );
    } catch (unlinkErr) {
      console.warn("Failed to unlink collection from products:", unlinkErr);
    }

    const deletedDoc = await Collection.findByIdAndDelete(id);

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "COLLECTION_DELETE",
        resource: "Collection",
        resourceId: String(id),
        details: {
          before: {
            name: deletedDoc.name,
            slug: deletedDoc.slug,
            type: deletedDoc.type,
            status: deletedDoc.status,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to record collection delete audit log:", auditErr);
    }

    return NextResponse.json({
      success: true,
      message: "Collection deleted successfully",
    });
  } catch (err) {
    console.error(`DELETE /api/collections/[id] error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete collection" },
      { status }
    );
  }
}
