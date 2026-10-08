import React from "react";
import { ReviewsListView } from "@/components/reviews/reviews-list-view";

export const metadata = {
  title: "Product Reviews & Moderation | VogueThreads Admin",
  description: "Customer ratings, moderation queue, verified purchasers, and official store responses.",
};

export default function ReviewsPage() {
  return <ReviewsListView />;
}
