"use client";

import React, { useState, useEffect } from "react";
import { X, Ruler, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SizeGuideModal({ isOpen, onClose, categoryName = "Tops" }) {
  if (!isOpen) return null;

  const [unit, setUnit] = useState("inches"); // "inches" | "cm"

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const measurements = [
    { size: "XS", chestIn: 38, chestCm: 96, lengthIn: 27, lengthCm: 68, shoulderIn: 18, shoulderCm: 46 },
    { size: "S", chestIn: 40, chestCm: 102, lengthIn: 28, lengthCm: 71, shoulderIn: 19, shoulderCm: 48 },
    { size: "M", chestIn: 43, chestCm: 109, lengthIn: 29, lengthCm: 74, shoulderIn: 20, shoulderCm: 51 },
    { size: "L", chestIn: 46, chestCm: 117, lengthIn: 30, lengthCm: 76, shoulderIn: 21, shoulderCm: 53 },
    { size: "XL", chestIn: 49, chestCm: 124, lengthIn: 31, lengthCm: 79, shoulderIn: 22, shoulderCm: 56 },
    { size: "XXL", chestIn: 52, chestCm: 132, lengthIn: 32, lengthCm: 81, shoulderIn: 23, shoulderCm: 58 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Shell */}
      <div className="relative w-full max-w-2xl bg-surface rounded-3xl shadow-2xl border border-border/80 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">Size & Fit Guide</h3>
              <p className="text-xs text-text-muted">Standard garment measurements for {categoryName}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white hover:bg-[#F3F2EE] text-[#5A5A5E] hover:text-[#141414] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Unit Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93]">
              Unit of Measure
            </span>
            <div className="inline-flex rounded-xl p-1 bg-[#F5F4F0] border border-[#E5E2DC]">
              <button
                type="button"
                onClick={() => setUnit("inches")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  unit === "inches"
                    ? "bg-white text-[#141414] shadow-xs font-semibold"
                    : "text-[#5A5A5E] hover:text-[#141414]"
                }`}
              >
                Inches (in)
              </button>
              <button
                type="button"
                onClick={() => setUnit("cm")}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  unit === "cm"
                    ? "bg-white text-[#141414] shadow-xs font-semibold"
                    : "text-[#5A5A5E] hover:text-[#141414]"
                }`}
              >
                Centimeters (cm)
              </button>
            </div>
          </div>

          {/* Measurements Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E5E2DC] bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F7F4] border-b border-[#E5E2DC] text-[#5A5A5E] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Chest</th>
                  <th className="py-3 px-4">Body Length</th>
                  <th className="py-3 px-4">Shoulder Width</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDF0] font-medium text-[#141414]">
                {measurements.map((row) => (
                  <tr key={row.size} className="hover:bg-[#F9F9FA] transition-colors">
                    <td className="py-3 px-4 font-bold">{row.size}</td>
                    <td className="py-3 px-4">{unit === "inches" ? `${row.chestIn}"` : `${row.chestCm} cm`}</td>
                    <td className="py-3 px-4">{unit === "inches" ? `${row.lengthIn}"` : `${row.lengthCm} cm`}</td>
                    <td className="py-3 px-4">{unit === "inches" ? `${row.shoulderIn}"` : `${row.shoulderCm} cm`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fit Advice Notice */}
          <div className="p-4 rounded-2xl bg-[#F8F7F4] border border-[#E5E2DC] flex items-start gap-3">
            <Info className="w-4 h-4 text-[#141414] shrink-0 mt-0.5" />
            <div className="text-xs text-[#5A5A5E] leading-relaxed space-y-1">
              <p className="font-semibold text-[#141414]">Architectural Boxy Fit Rationale</p>
              <p>
                Our garments are engineered with relaxed drop-shoulder tailoring and structured volume. If you prefer a generous modern oversized drape, select your standard size. If you desire a closer, traditional fit, we recommend taking one size down.
              </p>
            </div>
          </div>

          {/* How to Measure Guidelines */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#141414] mb-3">
              How to Measure
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#5A5A5E]">
              <div className="p-3 rounded-xl bg-[#F8F7F4] border border-[#E5E2DC]">
                <span className="font-semibold text-[#141414] block mb-1">1. Chest</span>
                Measure around the fullest part of your chest, keeping the tape horizontal under your arms.
              </div>
              <div className="p-3 rounded-xl bg-[#F8F7F4] border border-[#E5E2DC]">
                <span className="font-semibold text-[#141414] block mb-1">2. Length</span>
                Measure from the highest point of the shoulder seam straight down to the bottom hem.
              </div>
              <div className="p-3 rounded-xl bg-[#F8F7F4] border border-[#E5E2DC]">
                <span className="font-semibold text-[#141414] block mb-1">3. Shoulder</span>
                Measure across the back from the tip of one shoulder point straight across to the other.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EDEDF0] bg-[#FBFBF9] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Size Guide
          </Button>
        </div>
      </div>
    </div>
  );
}
