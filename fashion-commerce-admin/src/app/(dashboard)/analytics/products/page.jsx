import React from "react";
import { ProductAnalyticsView } from "@/components/analytics/product-analytics-view";

export const metadata = {
  title: "Product Analytics | VogueThreads Admin",
  description: "Apparel line-item sales velocity and inventory sell-through.",
};

export default function ProductAnalyticsPage() {
  return <ProductAnalyticsView />;
}
