import React from "react";
import { OrdersListView } from "@/components/orders/orders-list-view";

export const metadata = {
  title: "Orders Management | VogueThreads Admin",
  description: "Track customer orders, payments, logistics, and fulfillment pipeline.",
};

export default function OrdersPage() {
  return <OrdersListView />;
}
