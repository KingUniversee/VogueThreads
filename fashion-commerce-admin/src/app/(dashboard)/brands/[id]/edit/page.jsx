import React from "react";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongoose";
import Brand from "@/models/Brand";
import { BrandForm } from "@/components/brands/brand-form";

export async function generateMetadata({ params }) {
  const { id } = await params;
  await connectToDatabase();
  const brand = await Brand.findById(id).select("name").lean();
  return {
    title: brand ? `Edit: ${brand.name} | VogueThreads Admin` : "Edit Brand | VogueThreads",
  };
}

export default async function EditBrandPage({ params }) {
  const { id } = await params;
  await connectToDatabase();

  let brand;
  try {
    brand = await Brand.findById(id).lean();
  } catch (err) {
    notFound();
  }

  if (!brand) {
    notFound();
  }

  const serialized = JSON.parse(JSON.stringify(brand));

  return <BrandForm initialBrand={serialized} isEditMode={true} />;
}
