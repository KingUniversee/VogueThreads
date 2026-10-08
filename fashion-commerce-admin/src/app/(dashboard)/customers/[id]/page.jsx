import React from "react";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";

export const metadata = {
  title: "Customer Profile | VogueThreads Admin",
  description: "360-degree customer details, order history, addresses, and engagement metrics.",
};

export default async function CustomerDetailPage({ params }) {
  const { id } = await params;
  return <CustomerDetailView customerId={id} />;
}
