import React from "react";
import Link from "next/link";
import { ShoppingBag, RotateCcw, RefreshCw } from "lucide-react";
import { ModulePlaceholder } from "@/components/admin/module-placeholder";

export default function RefundsPage() {
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
        <Link
          href="/returns"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
          <span>Returns & Reverse Logistics</span>
        </Link>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold shadow-subtle whitespace-nowrap">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refunds & Reconciliation</span>
        </div>
      </div>

      <ModulePlaceholder
        title="Refunds & Financial Reconciliation"
        moduleNumber="12"
        targetPhase="6"
        description="Track and execute full/partial refunds via payment gateways (Razorpay, Cashfree, Bank Transfer)."
        plannedFeatures={[
          "Gateway refund execution with automated webhook confirmation",
          "Full vs partial refund calculators",
          "COD customer bank account verification & NEFT payout",
          "Audit trail of refund approvals with admin authorization stamps",
        ]}
      />
    </div>
  );
}
