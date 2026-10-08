import React from "react";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Collection from "@/models/Collection";
import { ProductForm } from "@/components/products/product-form";

export async function generateMetadata({ params }) {
  const { id } = await params;
  await connectToDatabase();
  const product = await Product.findOne({ _id: id, isDeleted: false }).select("title").lean();
  return {
    title: product ? `Edit: ${product.title} | VogueThreads Catalog` : "Edit Product | VogueThreads",
  };
}

export default async function EditProductPage({ params }) {
  const { id } = await params;
  await connectToDatabase();

  let product;
  try {
    product = await Product.findOne({ _id: id, isDeleted: false })
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug")
      .populate("collectionIds", "name slug")
      .lean();
  } catch (err) {
    notFound();
  }

  if (!product) {
    notFound();
  }

  // Fetch live inventory stock for variants from Inventory collection
  const inventories = await Inventory.find({ productId: product._id }).lean();
  const inventoryBySku = {};
  inventories.forEach((inv) => {
    inventoryBySku[inv.variantSku] = inv;
  });

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

  const serializedProduct = JSON.parse(
    JSON.stringify({
      ...product,
      variants: enrichedVariants,
    })
  );

  return <ProductForm initialProduct={serializedProduct} isEditMode={true} />;
}
