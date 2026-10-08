import React from "react";
import { CouponsListView } from "@/components/coupons/coupons-list-view";

export const metadata = {
  title: "Coupons & Promo Codes | VogueThreads Admin",
  description: "Manage coupon promo codes, percentage/fixed discounts, usage quotas, and targeting restrictions.",
};

export default function CouponsPage() {
  return <CouponsListView />;
}
