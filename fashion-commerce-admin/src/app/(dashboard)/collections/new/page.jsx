import React from "react";
import { CollectionForm } from "@/components/collections/collection-form";

export const metadata = {
  title: "Create Collection | VogueThreads Admin",
  description: "Curate a new fashion apparel collection or automated drop.",
};

export default function NewCollectionPage() {
  return <CollectionForm isEditMode={false} />;
}
