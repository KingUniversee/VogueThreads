import React from "react";
import { SegmentDetailView } from "@/components/customers/segment-detail-view";

export const metadata = {
  title: "Segment Members | VogueThreads Admin",
  description: "View customer members matching this cohort criteria.",
};

export default async function SegmentDetailPage({ params }) {
  const { id } = await params;
  return <SegmentDetailView segmentId={id} />;
}
