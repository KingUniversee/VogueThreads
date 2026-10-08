"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Boxes,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  CheckCircle2,
  FileText,
  RotateCcw,
  Sparkles,
  ClipboardCheck,
} from "lucide-react";
import { getCanonicalThreshold } from "@/lib/inventory-status";

const REASON_PRESETS = [
  "Supplier PO Delivery Restock",
  "Fabric Defect / Damaged Write-off",
  "Warehouse Physical Cycle Count",
  "Customer Return Restock",
  "Manual System Reconciliation",
  "Showroom / Photoshoot Sample Pull",
];

function getFieldConfig(type, mode) {
  if (
    type === "PHYSICAL_AUDIT" ||
    ((type === "CORRECTION" || type === "MANUAL_ADJUSTMENT") && mode === "SET")
  ) {
    return {
      label: type === "PHYSICAL_AUDIT" ? "Physical Counted Quantity" : "New Physical Quantity",
      placeholder: "e.g. 24",
      unit: "total on-hand",
      helper: "Enter the verified physical count on hand",
    };
  }
  switch (type) {
    case "RESTOCK":
      return {
        label: "Quantity to Add",
        placeholder: "e.g. 6",
        unit: "units to add",
        helper: "Units received from supplier shipment",
      };
    case "DAMAGE_WRITE_OFF":
      return {
        label: "Units Damaged",
        placeholder: "e.g. 6",
        unit: "units damaged",
        helper: "Damaged garments to write off from stock",
      };
    case "SHRINKAGE":
      return {
        label: "Units Lost",
        placeholder: "e.g. 6",
        unit: "units lost",
        helper: "Unaccounted loss or theft to write off",
      };
    case "RETURN_RESTOCK":
      return {
        label: "Units Returned",
        placeholder: "e.g. 6",
        unit: "units returned",
        helper: "Customer return units to add back into inventory",
      };
    case "CORRECTION":
    case "MANUAL_ADJUSTMENT":
    default:
      return {
        label: "Adjustment (+/-)",
        placeholder: "e.g. +6 or -6",
        unit: "units delta",
        helper: "Enter positive number to add, or negative to deduct",
      };
  }
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  item = null,
  onSuccess,
}) {
  const [type, setType] = useState("RESTOCK");
  const [mode, setMode] = useState("INCREMENT"); // "INCREMENT" or "SET"
  const [quantityStr, setQuantityStr] = useState("");
  const [reason, setReason] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (open) {
      setType("RESTOCK");
      setMode("INCREMENT");
      setQuantityStr("");
      setReason("");
      setReferenceId("");
      setNotes("");
      setErrorMessage("");
    }
  }, [open, item]);

  if (!item) return null;

  const currentOnHand = Number(item.onHand ?? 0);
  const currentReserved = Number(item.reserved ?? 0);
  const currentAvailable = Number(item.available ?? 0);

  // Field configuration based on operation
  const fieldConfig = getFieldConfig(type, mode);

  // Parse input safely without Math.abs
  const trimmed = quantityStr.trim();
  const isEmpty = trimmed === "";
  const parsedNum = Number(trimmed);
  const isInvalidNum = isEmpty || isNaN(parsedNum) || !Number.isFinite(parsedNum);

  let validationError = "";
  let computedDelta = 0;
  let targetOnHand = currentOnHand;

  if (isInvalidNum && !isEmpty) {
    validationError = "Please enter a valid numeric quantity.";
  } else if (!isEmpty) {
    switch (type) {
      case "RESTOCK": {
        if (parsedNum <= 0) {
          validationError = "Restock quantity must be positive.";
        } else {
          computedDelta = Math.floor(parsedNum);
          targetOnHand = currentOnHand + computedDelta;
        }
        break;
      }
      case "RETURN_RESTOCK": {
        if (parsedNum <= 0) {
          validationError = "Return quantity must be positive.";
        } else {
          computedDelta = Math.floor(parsedNum);
          targetOnHand = currentOnHand + computedDelta;
        }
        break;
      }
      case "DAMAGE_WRITE_OFF": {
        if (parsedNum === 0) {
          validationError = "Damaged units must be greater than zero.";
        } else {
          computedDelta = -Math.floor(Math.abs(parsedNum));
          targetOnHand = currentOnHand + computedDelta;
        }
        break;
      }
      case "SHRINKAGE": {
        if (parsedNum === 0) {
          validationError = "Shrinkage units must be greater than zero.";
        } else {
          computedDelta = -Math.floor(Math.abs(parsedNum));
          targetOnHand = currentOnHand + computedDelta;
        }
        break;
      }
      case "PHYSICAL_AUDIT": {
        if (parsedNum < 0) {
          validationError = "Physical count cannot be negative.";
        } else {
          targetOnHand = Math.floor(parsedNum);
          computedDelta = targetOnHand - currentOnHand;
        }
        break;
      }
      case "CORRECTION":
      case "MANUAL_ADJUSTMENT":
      default: {
        if (mode === "SET") {
          if (parsedNum < 0) {
            validationError = "New physical quantity cannot be negative.";
          } else {
            targetOnHand = Math.floor(parsedNum);
            computedDelta = targetOnHand - currentOnHand;
          }
        } else {
          if (parsedNum === 0) {
            validationError = "Adjustment delta must be non-zero.";
          } else {
            computedDelta = Math.floor(parsedNum);
            targetOnHand = currentOnHand + computedDelta;
          }
        }
        break;
      }
    }

    if (!validationError && targetOnHand < 0) {
      validationError = `Insufficient stock. Only ${currentOnHand} units are available.`;
    }
  }

  const targetAvailable = targetOnHand - currentReserved;
  if (!validationError && !isEmpty && !item.allowBackorder && targetAvailable < 0) {
    validationError = `Insufficient stock: ${currentReserved} units are reserved for orders. Available stock cannot be negative.`;
  }

  const isFormValid =
    !isEmpty &&
    !isInvalidNum &&
    !validationError &&
    (type === "PHYSICAL_AUDIT" || mode === "SET" || computedDelta !== 0) &&
    reason.trim().length > 0 &&
    !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        sku: item.variantSku,
        type,
        mode: type === "PHYSICAL_AUDIT" ? "SET" : mode,
        quantity: parsedNum,
        delta: computedDelta,
        newQuantity: targetOnHand,
        reason: reason.trim(),
        referenceId: referenceId.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to adjust inventory");
      }

      if (onSuccess) {
        onSuccess(json.data, json.transaction);
      }
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(err.message || "Failed to process adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-[95vw] sm:w-full p-0 flex flex-col gap-0 max-h-[calc(100vh-32px)] sm:max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden [&>button]:text-white [&>button]:hover:text-white">
        {/* Header with Apparel Context (Fixed / Non-scrolling) */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-white/10 text-emerald-400">
                  <Boxes className="h-4 w-4" />
                </span>
                <DialogTitle className="text-lg font-semibold text-white">
                  Stock Adjustment
                </DialogTitle>
              </div>
              <DialogDescription className="text-slate-300 text-xs">
                Update physical units and record an immutable transaction in the warehouse ledger.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="border-white/20 text-white font-mono text-xs mr-6 shrink-0">
              {item.variantSku}
            </Badge>
          </div>

          {/* Variant snapshot strip */}
          <div className="mt-4 p-3 rounded-xl bg-white/10 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-white truncate max-w-[280px]">
                {item.productTitle}
              </p>
              <p className="text-slate-300">
                Color: <span className="font-medium text-white">{item.color?.name}</span> • Size:{" "}
                <span className="font-medium text-white">{item.size}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-300">Current Available</p>
              <p className="text-base font-bold text-emerald-400">{currentAvailable} units</p>
            </div>
          </div>
        </div>

        {/* Top-level Form encompassing scrollable middle area & pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Middle Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 sm:space-y-5">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Adjustment Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Operation Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "RESTOCK", label: "Restock", icon: PlusCircle, color: "hover:border-emerald-500" },
                  { id: "DAMAGE_WRITE_OFF", label: "Damage", icon: MinusCircle, color: "hover:border-rose-500" },
                  { id: "PHYSICAL_AUDIT", label: "Audit Count", icon: ClipboardCheck, color: "hover:border-amber-500" },
                  { id: "CORRECTION", label: "Correction", icon: RotateCcw, color: "hover:border-indigo-500" },
                  { id: "RETURN_RESTOCK", label: "Return", icon: RotateCcw, color: "hover:border-purple-500" },
                  { id: "SHRINKAGE", label: "Shrinkage", icon: AlertCircle, color: "hover:border-red-500" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = type === opt.id || (opt.id === "CORRECTION" && type === "MANUAL_ADJUSTMENT");
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setType(opt.id);
                        if (opt.id === "PHYSICAL_AUDIT") {
                          setMode("SET");
                        } else if (opt.id === "RESTOCK" || opt.id === "RETURN_RESTOCK" || opt.id === "DAMAGE_WRITE_OFF" || opt.id === "SHRINKAGE") {
                          setMode("INCREMENT");
                        }
                      }}
                      className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : `bg-slate-50 text-slate-700 border-slate-200 ${opt.color}`
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-emerald-400" : "text-slate-500"}`} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adjustment Mode & Quantity Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {fieldConfig.label} <span className="text-rose-500">*</span>
                  </label>
                  {type === "CORRECTION" || type === "MANUAL_ADJUSTMENT" ? (
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setMode("INCREMENT")}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                          mode === "INCREMENT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        Delta (+/−)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("SET")}
                        className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                          mode === "SET" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        Set Exact
                      </button>
                    </div>
                  ) : type === "PHYSICAL_AUDIT" ? (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Exact Count Mode
                    </span>
                  ) : type === "RESTOCK" || type === "RETURN_RESTOCK" ? (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Inbound (+)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Deduction (−)
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Input
                    type="number"
                    step="1"
                    placeholder={fieldConfig.placeholder}
                    value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    className="pr-20 text-sm font-mono"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-[11px] text-slate-400">
                    {fieldConfig.unit}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">{fieldConfig.helper}</p>
              </div>

              {/* Reference ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Reference ID</label>
                <Input
                  type="text"
                  placeholder="PO-2026-0901, RMA-412"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="text-sm uppercase font-mono"
                />
                <p className="text-[10px] text-slate-400">Optional PO, RMA, or count sheet code</p>
              </div>
            </div>

            {/* Live Result Calculation Preview Box */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Current On-Hand: <strong className="text-slate-700">{currentOnHand}</strong></span>
                <span>Reserved: <strong className="text-amber-700">{currentReserved}</strong></span>
                <span>
                  Net Change:{" "}
                  <strong
                    className={
                      validationError || isEmpty
                        ? "text-slate-400 font-mono"
                        : computedDelta > 0
                        ? "text-emerald-600 font-mono"
                        : computedDelta < 0
                        ? "text-rose-600 font-mono"
                        : "text-slate-700 font-mono"
                    }
                  >
                    {validationError || isEmpty ? "—" : computedDelta > 0 ? `+${computedDelta}` : computedDelta}
                  </strong>
                </span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-700">Resulting Available Stock:</span>
                <span
                  className={`text-sm font-bold font-mono px-2 py-0.5 rounded-md ${
                    validationError || isEmpty
                      ? "bg-slate-100 text-slate-500"
                      : targetAvailable <= 0
                      ? "bg-rose-100 text-rose-800"
                      : targetAvailable <= getCanonicalThreshold(item)
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {validationError || isEmpty ? "—" : `${targetAvailable} units`}
                </span>
              </div>
              {validationError && (
                <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{validationError}</span>
                </p>
              )}
            </div>

            {/* Mandatory Reason with Fashion Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Reason for Adjustment <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">Required for audit log</span>
              </div>
              <Input
                type="text"
                placeholder="e.g. Received shipment from Surat warehouse"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs"
                required
              />
              {/* Quick Reason Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {REASON_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setReason(p)}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Additional Notes <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <Textarea
                rows={2}
                placeholder="Additional inspection details, bin/rack location remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* Fixed / Pinned Footer Action Bar (Non-scrolling) */}
          <div className="shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 bg-slate-50/90 backdrop-blur-xs border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isFormValid}
              className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Commit Adjustment</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
