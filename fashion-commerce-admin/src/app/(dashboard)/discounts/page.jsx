import React from "react";
import { DiscountsListView } from "@/components/discounts/discounts-list-view";

export const metadata = {
  title: "Automatic Discounts & Promotions | VogueThreads Admin",
  description: "Configure automatic store promotions, priority order, and catalog targeting.",
};

export default function DiscountsPage() {
  return <DiscountsListView />;
}
