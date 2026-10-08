import React from "react";
import { CategoryTreeView } from "@/components/categories/category-tree-view";

export const metadata = {
  title: "Categories Hierarchy | VogueThreads Admin",
  description: "Organize apparel category hierarchy, subcategories, and merchandising taxonomy.",
};

export default function CategoriesPage() {
  return <CategoryTreeView />;
}
