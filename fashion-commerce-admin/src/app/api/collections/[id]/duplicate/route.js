import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Collection from "@/models/Collection";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function POST(req, { params }) {
  try {
    const user = await assertPermission("collections.manage");
    await connectToDatabase();
    const { id } = await params;

    const original = await Collection.findById(id).lean();
    if (!original) {
      return NextResponse.json(
        { success: false, error: "Collection not found" },
        { status: 404 }
      );
    }

    const timestamp = Date.now().toString(36);
    const newSlug = `${original.slug}-copy-${timestamp}`;

    const cloned = await Collection.create({
      name: `${original.name} (Copy)`,
      slug: newSlug,
      description: original.description || "",
      imageUrl: original.imageUrl || "",
      bannerUrl: original.bannerUrl || "",
      type: original.type || "MANUAL",
      products: original.products || [],
      rules: original.rules || [],
      ruleMatchMode: original.ruleMatchMode || "ALL",
      status: "DRAFT",
      isActive: false,
      isFeatured: false,
      seo: {
        metaTitle: original.seo?.metaTitle ? `${original.seo.metaTitle} (Copy)` : "",
        metaDescription: original.seo?.metaDescription || "",
      },
      createdBy: user.email,
      updatedBy: user.email,
    });

    try {
      await AuditLog.create({
        actorId: user.id || user._id,
        actorEmail: user.email,
        action: "COLLECTION_DUPLICATE",
        resource: "Collection",
        resourceId: String(cloned._id),
        details: {
          originalId: String(original._id),
          newId: String(cloned._id),
          name: cloned.name,
        },
      });
    } catch (auditErr) {
      console.warn("Failed to write collection duplicate audit log:", auditErr);
    }

    return NextResponse.json({ success: true, data: cloned }, { status: 201 });
  } catch (err) {
    console.error(`POST /api/collections/[id]/duplicate error:`, err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to duplicate collection" },
      { status }
    );
  }
}
