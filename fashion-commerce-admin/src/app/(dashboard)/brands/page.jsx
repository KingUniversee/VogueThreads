import React from "react";
import { BrandListView } from "@/components/brands/brand-list-view";

export const metadata = {
  title: "Brand Registry | VogueThreads Admin",
  description: "Manage luxury designer houses, apparel brands, and manufacturing labels.",
};

export default function BrandsPage() {
  return <BrandListView />;
}
