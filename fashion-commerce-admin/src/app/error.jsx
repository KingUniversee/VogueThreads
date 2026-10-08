"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log safe error telemetry without exposing sensitive customer data
    console.error("Administrative Runtime Boundary caught exception:", error?.message || error);
  }, [error]);

  const displayMessage =
    error?.message && !error.message.includes("MONGO") && !error.message.includes("secret")
      ? error.message
      : "An unexpected operational error occurred while processing this administrative view.";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200 mb-4">
        Application Error
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Something went wrong
      </h1>

      <p className="max-w-lg text-sm text-slate-500 mb-8 leading-relaxed">
        {displayMessage}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm shadow-sm transition-colors"
        >
          <Home className="w-4 h-4" />
          Dashboard Overview
        </Link>
      </div>

      <div className="mt-10 text-xs text-slate-400">
        If this persists, verify your network connectivity or consult the System Security audit trail.
      </div>
    </div>
  );
}
