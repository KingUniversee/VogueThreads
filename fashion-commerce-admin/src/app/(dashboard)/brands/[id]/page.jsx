import React from "react";
import { BrandDetailView } from "@/components/brands/brand-detail-view";

export const metadata = {
  title: "Brand Details | VogueThreads Admin",
  description: "View brand details, assigned products, and metadata.",
};

export default async function BrandDetailPage({ params }) {
  const { id } = await params;
  return <BrandDetailView brandId={id} />;
}
