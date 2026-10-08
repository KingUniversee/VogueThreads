import React from "react";
import { ProductForm } from "@/components/products/product-form";

export const metadata = {
  title: "Create Product | VogueThreads Commerce OS",
  description: "Create a new apparel style with Color × Size variant matrix, HSN code, pricing, and media gallery.",
};

export default function NewProductPage() {
  return <ProductForm />;
}
