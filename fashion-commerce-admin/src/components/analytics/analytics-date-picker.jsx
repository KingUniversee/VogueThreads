"use client";

import React, { useState } from "react";
import { Calendar, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ANALYTICS_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom" },
];

export function AnalyticsDatePicker({
  selectedRange = "30d",
  onRangeChange,
  startDate = "",
  endDate = "",
  onRefresh,
  isLoading = false,
}) {
  const [isCustomOpen, setIsCustomOpen] = useState(selectedRange === "custom");
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handleSelectPreset = (presetId) => {
    if (presetId === "custom") {
      setIsCustomOpen(true);
    } else {
      setIsCustomOpen(false);
      onRangeChange?.(presetId);
    }
  };

  const handleApplyCustom = (e) => {
    e?.preventDefault();
    if (!customStart || !customEnd) return;
    onRangeChange?.("custom", customStart, customEnd);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200 shadow-sm">
        {/* Preset Range Pills */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {ANALYTICS_PRESETS.map((preset) => {
            const isActive = selectedRange === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                } disabled:opacity-50 cursor-pointer`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 px-2.5 gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
              title="Refresh Analytics Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-slate-900" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Form (Visible when 'Custom' preset is selected) */}
      {isCustomOpen && (
        <form
          onSubmit={handleApplyCustom}
          className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 text-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              From:
            </span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-slate-900"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-slate-900"
              required
            />
          </div>

          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !customStart || !customEnd}
            className="h-8 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Apply Range
          </Button>
        </form>
      )}
    </div>
  );
}
