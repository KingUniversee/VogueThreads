import React from "react";
import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/mongoose";
import Attribute from "@/models/Attribute";
import { AttributeForm } from "@/components/attributes/attribute-form";

export async function generateMetadata({ params }) {
  const { id } = await params;
  await connectToDatabase();
  const attribute = await Attribute.findById(id).select("name").lean();
  return {
    title: attribute ? `Edit: ${attribute.name} | VogueThreads Admin` : "Edit Attribute | VogueThreads",
  };
}

export default async function EditAttributePage({ params }) {
  const { id } = await params;
  await connectToDatabase();

  let attribute;
  try {
    attribute = await Attribute.findById(id).lean();
  } catch (err) {
    notFound();
  }

  if (!attribute) {
    notFound();
  }

  const serialized = JSON.parse(JSON.stringify(attribute));

  return <AttributeForm initialAttribute={serialized} isEditMode={true} />;
}
