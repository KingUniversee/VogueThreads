import React from "react";
import { CollectionDetailView } from "@/components/collections/collection-detail-view";

export const metadata = {
  title: "Collection Details | VogueThreads Admin",
  description: "View collection overview and curated products.",
};

export default async function CollectionDetailPage({ params }) {
  const { id } = await params;
  return <CollectionDetailView collectionId={id} />;
}
