import React from "react";
import { AttributeListView } from "@/components/attributes/attribute-list-view";

export const metadata = {
  title: "Fashion Attributes & Taxonomy | VogueThreads Admin",
  description: "Manage technical garment specifications, fabric choices, fits, and storefront search facets.",
};

export default function AttributesPage() {
  return <AttributeListView />;
}
