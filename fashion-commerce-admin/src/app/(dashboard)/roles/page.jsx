import React from "react";
import { RolesListView } from "@/components/system/roles-list-view";

export const metadata = {
  title: "Roles & Permissions | VogueThreads Admin",
  description: "Enterprise Role-Based Access Control matrix across Catalog, Inventory, Orders, Customers, Marketing, Analytics, and System.",
};

export default function RolesPage() {
  return <RolesListView />;
}
