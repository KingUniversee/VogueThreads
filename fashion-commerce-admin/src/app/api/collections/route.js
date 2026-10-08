import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Collection from "@/models/Collection";
import Product from "@/models/Product";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";
import { countCollectionProducts } from "@/lib/collection-rules";

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const statusParam = searchParams.get("status");
    const typeParam = searchParams.get("type");
    const visibilityParam = searchParams.get("visibility");
    const sortParam = searchParams.get("sort") || "recently_updated";
    const allParam = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    const filter = {};

    // Consumer backwards compatibility: if no query params, return active collections
    if (!statusParam && !typeParam && !visibilityParam && !query && !allParam && !searchParams.has("page")) {
      filter.isActive = true;
      const collections = await Collection.find(filter).sort({ name: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: collections,
        count: collections.length,
      });
    }

    // Status filter
    if (statusParam && statusParam !== "ALL") {
      filter.status = statusParam;
    }

    // Type filter
    if (typeParam && typeParam !== "ALL") {
      filter.type = typeParam;
    }

    // Visibility filter
    if (visibilityParam === "ACTIVE") {
      filter.isActive = true;
    } else if (visibilityParam === "INACTIVE") {
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

    // Compute real MongoDB collection telemetry counts
    const [totalCollections, activeCount, scheduledCount, draftCount] = await Promise.all([
      Collection.countDocuments(),
      Collection.countDocuments({ isActive: true }),
      Collection.countDocuments({ status: "SCHEDULED" }),
      Collection.countDocuments({ status: "DRAFT" }),
    ]);

    const totalFiltered = await Collection.countDocuments(filter);
    const skip = (page - 1) * limit;

    const collections = await Collection.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    // Dynamically calculate live product counts for each collection
    const dataWithCounts = await Promise.all(
      collections.map(async (col) => {
        const productCount = await countCollectionProducts(col);
        return {
          ...col,
          productCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: dataWithCounts,
      stats: {
        total: totalCollections,
        active: activeCount,
        scheduled: scheduledCount,
        draft: draftCount,
      },
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
      },
    });
  } catch (err) {
    console.error("GET /api/collections error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch collections" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = await assertPermission("collections.manage");
    await connectToDatabase();

    const body = await req.json();
    const {
      name,
      slug,
      description,
      imageUrl,
      bannerUrl,
      type = "MANUAL",
      products = [],
      rules = [],
      ruleMatchMode = "ALL",
      status = "DRAFT",
      isActive = true,
      isFeatured = false,
      publishAt,
      unpublishAt,
      seo,
    } = body;

    // 1. Mandatory Validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Collection name is required" },
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

    const existing = await Collection.findOne({ slug: cleanSlug });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Collection with slug '${cleanSlug}' already exists` },
        { status: 400 }
      );
    }

    // 2. Validate Type & Content
    const collectionType = type === "RULE_BASED" ? "RULE_BASED" : "MANUAL";

    let sanitizedProducts = [];
    if (collectionType === "MANUAL" && Array.isArray(products)) {
      sanitizedProducts = products.map((item, index) => ({
        product: item.product?._id || item.product,
        position: item.position !== undefined ? Number(item.position) : index,
      })).filter((item) => Boolean(item.product));
    }

    let sanitizedRules = [];
    if (collectionType === "RULE_BASED" && Array.isArray(rules)) {
      sanitizedRules = rules.map((r) => ({
        field: r.field,
        operator: r.operator || "EQUALS",
        value: String(r.value || "").trim(),
      })).filter((r) => r.field && r.value !== "");
    }

    // 3. Scheduling & Status Determination
    let finalStatus = status;
    const parsedPublishAt = publishAt ? new Date(publishAt) : null;
    const parsedUnpublishAt = unpublishAt ? new Date(unpublishAt) : null;

    if (parsedPublishAt && parsedPublishAt > new Date() && status !== "DRAFT" && status !== "ARCHIVED") {
      finalStatus = "SCHEDULED";
    }

    // 4. Create Document
    const collection = await Collection.create({
      name: name.trim(),
      slug: cleanSlug,
      description: description ? description.trim() : "",
      imageUrl: imageUrl ? imageUrl.trim() : "",
      bannerUrl: bannerUrl ? bannerUrl.trim() : "",
      type: collectionType,
      products: sanitizedProducts,
      rules: sanitizedRules,
      ruleMatchMode: ruleMatchMode === "ANY" ? "ANY" : "ALL",
      status: finalStatus,
      isActive: Boolean(isActive),
      isFeatured: Boolean(isFeatured),
      publishAt: parsedPublishAt,
      unpublishAt: parsedUnpublishAt,
      seo: {
        metaTitle: seo?.metaTitle ? seo.metaTitle.trim() : "",
        metaDescription: seo?.metaDescription ? seo.metaDescription.trim() : "",
      },
      createdBy: user.email,
      updatedBy: user.email,
    });

    // 5. Sync Product.collectionIds for manual products
    if (collectionType === "MANUAL" && sanitizedProducts.length > 0) {
      const productIds = sanitizedProducts.map((p) => p.product);
      try {
        await Product.updateMany(
          { _id: { $in: productIds } },
          { $addToSet: { collectionIds: collection._id } }
        );
      } catch (syncErr) {
        console.warn("Failed to sync collectionIds to Product documents:", syncErr);
      }
    }

    // 6. Audit Log
    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "COLLECTION_CREATE",
        resource: "Collection",
        resourceId: String(collection._id),
        details: {
          after: {
            name: collection.name,
            slug: collection.slug,
            type: collection.type,
            status: collection.status,
            productsCount: sanitizedProducts.length,
            rulesCount: sanitizedRules.length,
          },
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write collection create audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: collection }, { status: 201 });
  } catch (err) {
    console.error("POST /api/collections error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create collection" },
      { status }
    );
  }
}

