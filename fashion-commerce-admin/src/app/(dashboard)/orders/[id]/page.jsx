import React from "react";
import { redirect } from "next/navigation";
import { OrderDetailView } from "@/components/orders/order-detail-view";

const KNOWN_STATUS_SLUGS = [
  "pending",
  "pending_payment",
  "pending-payment",
  "confirmed",
  "paid",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "failed",
  "returned",
  "refunded",
];

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || "";
  return {
    title: `Order ${id} | VogueThreads Admin`,
    description: `Workspace and fulfillment management for order ${id}`,
  };
}

export default async function OrderDetailPage({ params }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || "";

  // Backward compatibility: If an old link hits /orders/processing or /orders/shipped, redirect to /orders with status filter
  const lowerId = id.toLowerCase();
  if (KNOWN_STATUS_SLUGS.includes(lowerId)) {
    let targetStatus = lowerId.toUpperCase().replace(/-/g, "_");
    if (targetStatus === "PENDING") targetStatus = "PENDING_PAYMENT";
    redirect(`/orders?status=${targetStatus}`);
  }

  return <OrderDetailView orderId={id} />;
}
