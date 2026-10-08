import React from "react";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongoose";
import Collection from "@/models/Collection";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import { CollectionForm } from "@/components/collections/collection-form";

export async function generateMetadata({ params }) {
  const { id } = await params;
  await connectToDatabase();
  const collection = await Collection.findById(id).select("name").lean();
  return {
    title: collection ? `Edit: ${collection.name} | VogueThreads Admin` : "Edit Collection | VogueThreads",
  };
}

export default async function EditCollectionPage({ params }) {
  const { id } = await params;
  await connectToDatabase();

  let collection;
  try {
    collection = await Collection.findById(id)
      .populate({
        path: "products.product",
        select: "title slug primaryImages variants status categoryId brandId",
        populate: [
          { path: "categoryId", select: "name slug" },
          { path: "brandId", select: "name slug" },
        ],
      })
      .lean();
  } catch (err) {
    notFound();
  }

  if (!collection) {
    notFound();
  }

  const serialized = JSON.parse(JSON.stringify(collection));

  return <CollectionForm initialCollection={serialized} isEditMode={true} />;
}
