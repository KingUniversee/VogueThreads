import React from "react";
import { BrandForm } from "@/components/brands/brand-form";

export const metadata = {
  title: "Register Brand | VogueThreads Admin",
  description: "Register a new fashion designer label or brand.",
};

export default function NewBrandPage() {
  return <BrandForm isEditMode={false} />;
}
