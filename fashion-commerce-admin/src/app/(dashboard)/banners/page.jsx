import React from "react";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function BannersPage() {
  return (
    <ModulePlaceholder
      title="Storefront Banners & Hero Placements"
      moduleNumber="19"
      targetPhase="8"
      description="Manage visual promotional graphics, hero carousels, announcement bars, and seasonal banners for future storefronts."
      plannedFeatures={[
        "Placement slots: Home Hero Carousel, Sticky Announcement Bar, Category Top Banners",
        "Desktop vs Mobile responsive image uploaders",
        "Click-through links, CTA text, and schedule timers",
      ]}
    />
  );
}
