import React from "react";
import { ProductListView } from "@/components/products/product-list-view";

export const metadata = {
  title: "Products Catalog | VogueThreads Commerce OS",
  description: "Manage clothing apparel products, Color × Size variant matrices, prices, and merchandising data.",
};

export default function ProductsPage() {
  return <ProductListView />;
}
