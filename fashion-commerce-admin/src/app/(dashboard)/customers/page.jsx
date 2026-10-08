import React from "react";
import { CustomersListView } from "@/components/customers/customers-list-view";

export const metadata = {
  title: "Customers CRM | VogueThreads Admin",
  description: "Customer directory, RFM behavior, Lifetime Value metrics, and profile management.",
};

export default function CustomersPage() {
  return <CustomersListView />;
}
