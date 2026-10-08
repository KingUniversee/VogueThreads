import React from "react";
import Link from "next/link";
import { ShoppingBag, RotateCcw, RefreshCw } from "lucide-react";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function ReturnsPage() {
  return (
    <div className="space-y-6">
      {/* Top Module Sub-Navigation Bar */}
      <div className="flex items-center gap-2 bg-white p-3.5 rounded-lg border border-slate-200 shadow-subtle overflow-x-auto">
        <Link
          href="/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
          <span>Orders Management</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold shadow-subtle whitespace-nowrap">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Returns & Reverse Logistics</span>
        </div>
        <Link
          href="/refunds"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          <span>Refunds & Reconciliation</span>
        </Link>
      </div>

      <ModulePlaceholder
        title="Returns & Reverse Logistics"
        moduleNumber="11"
        targetPhase="6"
        description="Manage customer returns workflow: Requested → Approved → Pickup → Received → Inspected → Approved for Refund."
        plannedFeatures={[
          "Return requests queue with customer reasons & garment photos",
          "Reverse pickup courier generation (Delhivery / Shiprocket)",
          "Quality check (QC) inspection checklist for restock vs damage write-off",
          "One-click handoff to refund execution upon inspection pass",
        ]}
      />
    </div>
  );
}
