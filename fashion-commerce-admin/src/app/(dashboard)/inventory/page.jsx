import React from "react";
import { InventoryListView } from "@/components/inventory/inventory-list-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inventory Management | VogueThreads Admin",
  description: "Real-time apparel variant inventory and warehouse stock control",
};

export default function InventoryPage() {
  return <InventoryListView />;
}
