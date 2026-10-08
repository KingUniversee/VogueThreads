import React, { Suspense } from "react";
import { StockAdjustmentsView } from "@/components/inventory/stock-adjustments-view";

export const metadata = {
  title: "Stock Adjustments Ledger | VogueThreads Admin",
  description: "Immutable transaction history of all stock additions, write-offs, and reconciliations",
};

export default function StockAdjustmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading ledger...</div>}>
      <StockAdjustmentsView />
    </Suspense>
  );
}
