import React from "react";
import { ConversionAnalyticsView } from "@/components/analytics/conversion-analytics-view";

export const metadata = {
  title: "Conversion Analytics | VogueThreads Admin",
  description: "Authentic commerce conversion rates and storefront telemetry status.",
};

export default function ConversionAnalyticsPage() {
  return <ConversionAnalyticsView />;
}
