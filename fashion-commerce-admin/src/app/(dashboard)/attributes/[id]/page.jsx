import React from "react";
import { AttributeDetailView } from "@/components/attributes/attribute-detail-view";

export const metadata = {
  title: "Attribute Details | VogueThreads Admin",
  description: "View attribute configuration, allowed values, and product usage.",
};

export default async function AttributeDetailPage({ params }) {
  const { id } = await params;
  return <AttributeDetailView attributeId={id} />;
}
