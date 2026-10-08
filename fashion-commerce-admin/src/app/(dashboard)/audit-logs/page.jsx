import React from "react";
import { AuditLogsListView } from "@/components/system/audit-logs-list-view";

export const metadata = {
  title: "Audit Logs | VogueThreads Admin",
  description: "Immutable compliance ledger tracking administrative changes, inventory adjustments, order cancellations, and refunds.",
};

export default function AuditLogsPage() {
  return <AuditLogsListView />;
}
