import React from "react";
import { SalesAnalyticsView } from "@/components/analytics/sales-analytics-view";

export const metadata = {
  title: "Sales Analytics | VogueThreads Admin",
  description: "Financial sales breakdown and gateway settlement across VogueThreads.",
};

export default function SalesAnalyticsPage() {
  return <SalesAnalyticsView />;
}
