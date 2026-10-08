import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function POST(req, { params }) {
  try {
    const user = await assertPermission("products.create");
    await connectToDatabase();

    const { id } = await params;

    const original = await Product.findOne({ _id: id, isDeleted: false }).lean();
    if (!original) {
      return NextResponse.json(
        { success: false, error: "Source product to duplicate not found" },
        { status: 404 }
      );
    }

    // 1. Generate unique title and slug
    const newTitle = `${original.title} (Copy)`;
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const newSlug = `${original.slug}-copy-${randomSuffix}`;

    // 2. Generate unique SKUs for cloned variants
    const newVariants = [];
    for (let i = 0; i < (original.variants || []).length; i++) {
      const origVar = original.variants[i];
      const baseSuffix = `CPY${randomSuffix.toUpperCase()}`;
      let newSku = `${origVar.sku}-${baseSuffix}`;

      // Ensure uniqueness
      let attempts = 0;
      while (
        (await Product.exists({ "variants.sku": newSku })) ||
        (await Inventory.exists({ variantSku: newSku }))
      ) {
        attempts++;
        newSku = `${origVar.sku}-${baseSuffix}${attempts}`;
      }

      newVariants.push({
        variantId: `var_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sku: newSku,
        barcode: undefined,
        color: origVar.color,
        size: origVar.size,
        price: origVar.price,
        compareAtPrice: origVar.compareAtPrice,
        costPrice: origVar.costPrice,
        weightGrams: origVar.weightGrams,
        images: origVar.images || [],
        availability: "IN_STOCK",
        isActive: true,
      });
    }

    // 3. Create cloned product document (starts strictly as DRAFT)
    const clonedProduct = await Product.create({
      title: newTitle,
      slug: newSlug,
      description: original.description || "",
      shortDescription: original.shortDescription || "",
      categoryId: original.categoryId,
      brandId: original.brandId || null,
      collectionIds: original.collectionIds || [],
      gender: original.gender || "UNISEX",
      hsnCode: original.hsnCode || "6109",
      gstRate: original.gstRate || 5,
      status: "DRAFT", // Duplicated product always starts as DRAFT
      publishAt: null,
      primaryImages: original.primaryImages || [],
      variants: newVariants,
      attributes: original.attributes || [],
      careInstructions: original.careInstructions || [],
      tags: original.tags || [],
    });

    // 4. Initialize fresh Inventory records with zero stock
    // (Do NOT copy historical stock quantities)
    await Promise.all(
      newVariants.map((v) =>
        Inventory.create({
          variantSku: v.sku,
          productId: clonedProduct._id,
          variantId: v.variantId,
          onHand: 0,
          reserved: 0,
          available: 0,
          lowStockThreshold: 5,
        })
      )
    );

    // 5. Audit Log
    try {
      await AuditLog.create({
        actorId: user.id,
        actorEmail: user.email,
        action: "PRODUCT_DUPLICATE",
        resource: "Product",
        resourceId: String(clonedProduct._id),
        details: {
          originalId: String(original._id),
          originalTitle: original.title,
          newTitle: clonedProduct.title,
          variantsCloned: newVariants.length,
        },
      });
    } catch (auditErr) {
      console.warn("⚠️ [AuditLog] Error recording product duplication:", auditErr.message);
    }

    return NextResponse.json({ success: true, data: clonedProduct }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products/[id]/duplicate error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to duplicate product" },
      { status }
    );
  }
}
