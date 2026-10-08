import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Package, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-6 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 mb-4">
        HTTP 404 — Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
        Resource Not Found
      </h1>

      <p className="max-w-md text-sm text-slate-500 mb-8 leading-relaxed">
        The administrative route or resource you are looking for does not exist, has been archived, or you may not have the required role privileges.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard Overview
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-sm transition-colors"
        >
          <Package className="w-4 h-4" />
          Products Catalog
        </Link>
      </div>

      <div className="mt-12 text-xs text-slate-400">
        VogueThreads Commerce OS &bull; Operational Control Center
      </div>
    </div>
  );
}
