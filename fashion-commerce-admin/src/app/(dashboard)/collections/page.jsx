import React from "react";
import { CollectionListView } from "@/components/collections/collection-list-view";

export const metadata = {
  title: "Collections & Drops | VogueThreads Admin",
  description: "Curate manual and rule-based apparel merchandising collections.",
};

export default function CollectionsPage() {
  return <CollectionListView />;
}
