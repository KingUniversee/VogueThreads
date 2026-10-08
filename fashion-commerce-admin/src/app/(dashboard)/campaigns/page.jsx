import React from "react";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function CampaignsPage() {
  return (
    <ModulePlaceholder
      title="Marketing Campaigns"
      moduleNumber="18"
      targetPhase="8"
      description="Track and orchestrate seasonal apparel launches (Festive Diwali Drop, End of Season Sale, Summer Essentials)."
      plannedFeatures={[
        "Campaign timeline management with budget and revenue attribution",
        "Associated collection and coupon bundling",
        "Performance tracking and ROI metrics",
      ]}
    />
  );
}
