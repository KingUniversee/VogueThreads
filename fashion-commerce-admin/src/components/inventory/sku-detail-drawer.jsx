"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Boxes,
  Copy,
  Check,
  Edit2,
  ExternalLink,
  History,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  Warehouse,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCanonicalThreshold } from "@/lib/inventory-status";

export function SkuDetailDrawer({
  item,
  open,
  onClose,
  onAdjustClick,
  onThresholdUpdated,
}) {
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdVal, setThresholdVal] = useState(getCanonicalThreshold(item));
  const [isSavingThreshold, setIsSavingThreshold] = useState(false);

  useEffect(() => {
    if (open && item?.variantSku) {
      setThresholdVal(getCanonicalThreshold(item));
      setIsEditingThreshold(false);
      fetchHistory(item.variantSku);
    }
  }, [open, item]);

  const fetchHistory = async (sku) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/inventory/adjustments?sku=${encodeURIComponent(sku)}&limit=10`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data || []);
      }
    } catch (err) {
      console.warn("Error fetching SKU history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const copySku = () => {
    if (!item?.variantSku) return;
    navigator.clipboard.writeText(item.variantSku);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveThreshold = async () => {
    if (!item?.variantSku) return;
    setIsSavingThreshold(true);
    try {
      const res = await fetch("/api/inventory/threshold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: item.variantSku,
          threshold: Number(thresholdVal),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditingThreshold(false);
        if (onThresholdUpdated) onThresholdUpdated(item.variantSku, Number(thresholdVal));
      }
    } catch (err) {
      console.warn("Failed to update threshold:", err);
    } finally {
      setIsSavingThreshold(false);
    }
  };

  if (!open || !item) return null;

  const onHand = Number(item.onHand ?? 0);
  const reserved = Number(item.reserved ?? 0);
  const available = Number(item.available ?? 0);
  const threshold = getCanonicalThreshold(item);

  const getStatusBadge = () => {
    if (available <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Out of Stock
        </span>
      );
    }
    if (available <= threshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        In Stock
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
              <Boxes className="h-4 w-4 text-emerald-400" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">SKU Control Panel</h3>
              <p className="text-xs text-slate-500">Real-time stock details & ledger</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Product Profile Card */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden relative shrink-0">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.productTitle}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Boxes className="h-6 w-6" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {item.category || "Apparel"}
                </span>
                {getStatusBadge()}
              </div>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {item.productTitle}
              </h4>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: item.color?.hex || "#000" }}
                  />
                  {item.color?.name || "Color"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-800">Size {item.size}</span>
                <span className="text-slate-300">•</span>
                <span className="font-semibold text-slate-900">₹{item.price?.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* SKU & Barcode Bar */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">SKU Code</p>
                <p className="font-mono font-bold text-slate-800">{item.variantSku}</p>
              </div>
              <button
                type="button"
                onClick={copySku}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
                title="Copy SKU"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Warehouse</p>
              <p className="font-medium text-slate-800 flex items-center gap-1 truncate">
                <Warehouse className="h-3 w-3 text-slate-400 shrink-0" />
                {item.warehouseLocation || "Main Warehouse"}
              </p>
            </div>
          </div>

          {/* Stock Metrics Breakdown */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Stock Breakdown</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Available = On-Hand − Reserved
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">On-Hand</p>
                <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">{onHand}</p>
                <span className="text-[10px] text-slate-400">physical</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-amber-600">Reserved</p>
                <p className="text-lg font-bold text-amber-700 font-mono mt-0.5">{reserved}</p>
                <span className="text-[10px] text-amber-600/70">pending orders</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Available</p>
                <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{available}</p>
                <span className="text-[10px] text-emerald-600/70">sellable</span>
              </div>
            </div>

            {/* Threshold Settings */}
            <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Safety Alert Threshold:</span>
              {isEditingThreshold ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    value={thresholdVal}
                    onChange={(e) => setThresholdVal(e.target.value)}
                    className="h-7 w-16 text-xs text-center font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={saveThreshold}
                    disabled={isSavingThreshold}
                    className="h-7 px-2 text-xs bg-slate-900 text-white"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 font-mono">{threshold} units</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingThreshold(true)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                onClose();
                if (onAdjustClick) onAdjustClick(item);
              }}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs h-9"
            >
              <Boxes className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              <span>Adjust Stock</span>
            </Button>
            {item.productId && (
              <Button size="sm" variant="outline" asChild className="text-xs h-9">
                <Link href={`/products/${item.productId}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  <span>Product</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Mini Transaction History Ledger */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-500" />
                <span>Recent Ledger Transactions</span>
              </h5>
              <Link
                href={`/inventory/adjustments?sku=${encodeURIComponent(item.variantSku)}`}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:underline"
              >
                View full ledger →
              </Link>
            </div>

            {isLoadingHistory ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading ledger...</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 font-medium">No ledger transactions recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Initial stock level created at variant registration.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((tx) => {
                  const isPositive = (tx.delta ?? 0) > 0;
                  return (
                    <div
                      key={tx._id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {tx.type?.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`font-mono font-bold flex items-center gap-0.5 text-xs ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {isPositive ? `+${tx.delta}` : tx.delta}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span className="truncate max-w-[200px]">{tx.reason}</span>
                        <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
