import React, { Suspense } from "react";
import { LowStockView } from "@/components/inventory/low-stock-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Low Stock Alerts | VogueThreads Admin",
  description: "Real-time replenishment triage station for variants below safety thresholds",
};

export default function LowStockPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>}>
      <LowStockView />
    </Suspense>
  );
}
