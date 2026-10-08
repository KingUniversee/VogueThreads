import React from "react";
import { SegmentsListView } from "@/components/customers/segments-list-view";

export const metadata = {
  title: "Customer Segments | VogueThreads Admin",
  description: "Dynamic RFM rule-based cohorts and targeted customer groups.",
};

export default function CustomerSegmentsPage() {
  return <SegmentsListView />;
}
