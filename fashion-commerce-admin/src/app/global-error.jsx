"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Critical Root Boundary Error:", error?.message || error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 text-center shadow-2xl backdrop-blur-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-6">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            System Level Exception
          </h1>

          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The administrative framework encountered a critical runtime exception at root level.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>

          <p className="mt-8 text-xs text-slate-500">
            VogueThreads Commerce OS &bull; Kernel Exception Handler
          </p>
        </div>
      </body>
    </html>
  );
}
