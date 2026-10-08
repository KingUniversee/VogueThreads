import React from "react";
import { CustomerAnalyticsView } from "@/components/analytics/customer-analytics-view";

export const metadata = {
  title: "Customer Analytics | VogueThreads Admin",
  description: "Customer cohorts, acquisition, and LTV tiers across VogueThreads.",
};

export default function CustomerAnalyticsPage() {
  return <CustomerAnalyticsView />;
}
