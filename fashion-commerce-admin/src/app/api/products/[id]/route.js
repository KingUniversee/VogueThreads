import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import Order from "@/models/Order";
import InventoryTransaction from "@/models/InventoryTransaction";
import AuditLog from "@/models/AuditLog";
import { assertPermission } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await assertPermission("products.read");
    await connectToDatabase();

    const { id } = await params;

    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .populate("collectionIds", "name slug")
      .lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Fetch live inventory quantities from Inventory collection (single source of truth)
    const inventories = await Inventory.find({ productId: product._id }).lean();
    const inventoryBySku = {};
    inventories.forEach((inv) => {
      inventoryBySku[inv.variantSku] = inv;
    });

    // Merge live stock into variants
    const enrichedVariants = (product.variants || []).map((v) => {
      const inv = inventoryBySku[v.sku] || {
        onHand: 0,
        reserved: 0,
        available: 0,
        lowStockThreshold: 5,
      };

      return {
        ...v,
        inventory: {
          onHand: inv.onHand || 0,
          reserved: inv.reserved || 0,
          available: inv.available || 0,
          lowStockThreshold: inv.lowStockThreshold || 5,
          status:
            (inv.available || 0) <= 0
              ? "OUT_OF_STOCK"
              : (inv.available || 0) <= (inv.lowStockThreshold || 5)
              ? "LOW_STOCK"
              : "IN_STOCK",
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        variants: enrichedVariants,
      },
    });
  } catch (err) {
    console.error("GET /api/products/[id] error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch product" },
      { status }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await assertPermission("products.update");
    await connectToDatabase();

    const { id } = await params;
    const body = await req.json();

    const existingProduct = await Product.findOne({ _id: id, isDeleted: false });
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const {
      title,
      slug,
      description,
      shortDescription,
      categoryId,
      brandId,
      collectionIds,
      gender,
      hsnCode,
      gstRate,
      status,
      publishAt,
      primaryImages,
      variants,
      attributes,
      careInstructions,
      tags,
    } = body;

    // 1. Slug check if changed
    let updatedSlug = existingProduct.slug;
    if (slug && slug !== existingProduct.slug) {
      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const slugInUse = await Product.findOne({
        slug: cleanSlug,
        _id: { $ne: existingProduct._id },
      });

      if (slugInUse) {
        return NextResponse.json(
          { success: false, error: `Slug '${cleanSlug}' is already in use by another product` },
          { status: 400 }
        );
      }
      updatedSlug = cleanSlug;
    }

    // 2. Status validation (DRAFT, SCHEDULED, PUBLISHED, ARCHIVED only - NO ACTIVE)
    let updatedStatus = existingProduct.status;
    if (status) {
      const validStatuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];
      if (validStatuses.includes(status.toUpperCase())) {
        updatedStatus = status.toUpperCase();
      }
    }

    // 3. Process and validate variants if provided
    let updatedVariants = existingProduct.variants;
    if (Array.isArray(variants) && variants.length > 0) {
      const skuSet = new Set();
      const formattedVariants = [];

      for (const v of variants) {
        if (!v.sku || !v.sku.trim()) {
          return NextResponse.json(
            { success: false, error: "Every variant must have a valid SKU" },
            { status: 400 }
          );
        }

        const upperSku = v.sku.trim().toUpperCase();

        if (skuSet.has(upperSku)) {
          return NextResponse.json(
            { success: false, error: `Duplicate SKU '${upperSku}' within variant list` },
            { status: 400 }
          );
        }
        skuSet.add(upperSku);

        // Check global database SKU uniqueness excluding current product's own existing variants
        const existingWithSku = await Product.findOne({
          "variants.sku": upperSku,
          _id: { $ne: existingProduct._id },
        });

        if (existingWithSku) {
          return NextResponse.json(
            {
              success: false,
              error: `SKU '${upperSku}' is already in use by product '${existingWithSku.title}'`,
            },
            { status: 400 }
          );
        }

        // Check inventory collection for SKU conflicts with other products
        const existingInv = await Inventory.findOne({
          variantSku: upperSku,
          productId: { $ne: existingProduct._id },
        });

        if (existingInv) {
          return NextResponse.json(
            {
              success: false,
              error: `SKU '${upperSku}' is registered to another product in warehouse inventory`,
            },
            { status: 400 }
          );
        }

        formattedVariants.push({
          variantId: v.variantId || `var_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          sku: upperSku,
          barcode: v.barcode ? String(v.barcode).trim() : undefined,
          color: {
            name: v.color?.name || "Default",
            hex: v.color?.hex || "#000000",
            code: v.color?.code || "",
          },
          size: v.size || "M",
          price: Number(v.price) || 0,
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
          costPrice: v.costPrice ? Number(v.costPrice) : undefined,
          weightGrams: Number(v.weightGrams) || 300,
          images: Array.isArray(v.images) ? v.images : [],
          availability: v.availability || "IN_STOCK",
          isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
        });
      }

      updatedVariants = formattedVariants;

      // Synchronize Inventory Collection
      // For any newly introduced variant SKU, initialize Inventory with 0
      // Existing variant SKUs preserve their onHand/reserved/available stock
      for (const v of updatedVariants) {
        const existingInv = await Inventory.findOne({ variantSku: v.sku });
        if (!existingInv) {
          await Inventory.create({
            variantSku: v.sku,
            productId: existingProduct._id,
            variantId: v.variantId,
            onHand: 0,
            reserved: 0,
            available: 0,
            lowStockThreshold: 5,
          });
        }
      }
    }

    // Apply updates
    if (title) existingProduct.title = title.trim();
    existingProduct.slug = updatedSlug;
    if (description !== undefined) existingProduct.description = description;
    if (shortDescription !== undefined) existingProduct.shortDescription = shortDescription;
    if (categoryId) existingProduct.categoryId = categoryId;
    if (brandId !== undefined) existingProduct.brandId = brandId || null;
    if (collectionIds !== undefined) existingProduct.collectionIds = collectionIds;
    if (gender) existingProduct.gender = gender;
    if (hsnCode) existingProduct.hsnCode = hsnCode;
    if (gstRate !== undefined) existingProduct.gstRate = Number(gstRate);
    existingProduct.status = updatedStatus;
    if (updatedStatus === "SCHEDULED" && publishAt) {
      existingProduct.publishAt = new Date(publishAt);
    }
    if (primaryImages !== undefined) existingProduct.primaryImages = primaryImages;
    existingProduct.variants = updatedVariants;
    if (attributes !== undefined) existingProduct.attributes = attributes;
    if (careInstructions !== undefined) existingProduct.careInstructions = careInstructions;
    if (tags !== undefined) existingProduct.tags = tags;

    await existingProduct.save();

    // Audit Log
    try {
      await AuditLog.create({
        actorId: user.id,
        actorEmail: user.email,
        action: "PRODUCT_UPDATE",
        resource: "Product",
        resourceId: String(existingProduct._id),
        details: {
          title: existingProduct.title,
          status: existingProduct.status,
          variantsCount: updatedVariants.length,
        },
      });
    } catch (auditErr) {
      console.warn("⚠️ [AuditLog] Error recording product update:", auditErr.message);
    }

    return NextResponse.json({ success: true, data: existingProduct });
  } catch (err) {
    console.error("PATCH /api/products/[id] error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update product" },
      { status }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await assertPermission("products.delete");
    await connectToDatabase();

    const { id } = await params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Safety check: Check if product or its variants are referenced in Orders or historical Inventory transactions
    const hasOrders = await Order.exists({ "items.productId": product._id });
    const hasTransactions = await InventoryTransaction.exists({ productId: product._id });

    if (hasOrders || hasTransactions) {
      // Historical references exist: apply safe soft-delete/archive
      product.isDeleted = true;
      product.deletedAt = new Date();
      product.status = "ARCHIVED";
      await product.save();

      try {
        await AuditLog.create({
          actorId: user.id,
          actorEmail: user.email,
          action: "PRODUCT_ARCHIVE",
          resource: "Product",
          resourceId: String(product._id),
          details: {
            reason: "Soft-deleted / archived because historical order or stock references exist",
          },
        });
      } catch (auditErr) {
        // Non-critical
      }

      return NextResponse.json({
        success: true,
        message: "Product has historical order references and has been safely archived.",
        archived: true,
      });
    }

    // No historical orders or transactions: safe permanent removal
    product.isDeleted = true;
    product.deletedAt = new Date();
    product.status = "ARCHIVED";
    await product.save();

    // Clean up unreferenced zero-stock inventory records
    await Inventory.deleteMany({ productId: product._id, onHand: 0, reserved: 0 });

    try {
      await AuditLog.create({
        actorId: user.id,
        actorEmail: user.email,
        action: "PRODUCT_DELETE",
        resource: "Product",
        resourceId: String(product._id),
        details: { title: product.title },
      });
    } catch (auditErr) {
      // Non-critical
    }

    return NextResponse.json({
      success: true,
      message: "Product safely removed.",
      deleted: true,
    });
  } catch (err) {
    console.error("DELETE /api/products/[id] error:", err);
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete product" },
      { status }
    );
  }
}
