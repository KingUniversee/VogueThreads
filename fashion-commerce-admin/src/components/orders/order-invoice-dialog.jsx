"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { formatINR, formatDate } from "@/lib/formatters";

export function OrderInvoiceDialog({ open, onOpenChange, order }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const shipping = order.shippingAddress || {};
  const billing = order.billingAddress || shipping;
  const pricing = order.pricing || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 print:p-0 print:max-w-none print:shadow-none print:border-none">
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/40 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Tax Invoice Preview</span>
            <span className="text-xs text-muted-foreground">({order.orderNumber})</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>

        {/* Printable Tax Invoice Container */}
        <div id="tax-invoice-printable" className="p-8 bg-white text-zinc-950 font-sans text-xs space-y-6">
          {/* Invoice Header */}
          <div className="flex justify-between items-start border-b pb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">VOGUETHREADS</h1>
              <p className="text-xs text-zinc-500 font-medium">Standalone Luxury E-Commerce</p>
              <div className="mt-2 text-zinc-600 text-[11px] leading-relaxed">
                <p>VogueThreads Retail Pvt. Ltd.</p>
                <p>Plot 42, Apparel Park, Phase II</p>
                <p>Bengaluru, Karnataka — 560100, India</p>
                <p className="font-mono">GSTIN: 29AAAAA0000A1Z5</p>
                <p>contact@voguethreads.in | +91 80 4910 2000</p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-zinc-100 rounded text-zinc-900 font-bold uppercase tracking-wider text-[11px] mb-2">
                TAX INVOICE
              </div>
              <div className="text-zinc-600 text-[11px] space-y-1">
                <p>
                  <span className="text-zinc-400">Invoice No:</span>{" "}
                  <span className="font-mono font-semibold text-zinc-900">{order.orderNumber}</span>
                </p>
                <p>
                  <span className="text-zinc-400">Order Date:</span>{" "}
                  <span>{order.createdAt ? formatDate(order.createdAt) : "N/A"}</span>
                </p>
                <p>
                  <span className="text-zinc-400">Payment:</span>{" "}
                  <span className="font-semibold uppercase">{order.payment?.method || "UPI"} ({order.payment?.status || "PENDING"})</span>
                </p>
                {order.fulfillment?.awbNumber && (
                  <p>
                    <span className="text-zinc-400">AWB No:</span>{" "}
                    <span className="font-mono">{order.fulfillment.awbNumber}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Addresses Grid */}
          <div className="grid grid-cols-2 gap-8 border-b pb-6 text-[11px]">
            <div>
              <p className="font-bold text-zinc-900 uppercase tracking-wider mb-1.5 text-[10px]">
                Billed To (Customer):
              </p>
              <p className="font-semibold text-zinc-900">{billing.fullName || order.customerDetails?.name}</p>
              <p className="text-zinc-600">{billing.addressLine1}</p>
              {billing.addressLine2 && <p className="text-zinc-600">{billing.addressLine2}</p>}
              <p className="text-zinc-600">
                {billing.city}, {billing.state} — {billing.pinCode}
              </p>
              <p className="text-zinc-600">Phone: {billing.phone || order.customerDetails?.phone}</p>
              <p className="text-zinc-600">Email: {order.customerDetails?.email}</p>
              {billing.gstin && <p className="font-mono font-medium mt-1">Customer GSTIN: {billing.gstin}</p>}
            </div>

            <div>
              <p className="font-bold text-zinc-900 uppercase tracking-wider mb-1.5 text-[10px]">
                Shipped To (Delivery Destination):
              </p>
              <p className="font-semibold text-zinc-900">{shipping.fullName || order.customerDetails?.name}</p>
              <p className="text-zinc-600">{shipping.addressLine1}</p>
              {shipping.addressLine2 && <p className="text-zinc-600">{shipping.addressLine2}</p>}
              <p className="text-zinc-600">
                {shipping.city}, {shipping.state} — {shipping.pinCode}
              </p>
              <p className="text-zinc-600">Phone: {shipping.phone || order.customerDetails?.phone}</p>
              <p className="text-zinc-600">Country: India (State Code: {shipping.state ? shipping.state.slice(0, 2).toUpperCase() : "IN"})</p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-zinc-900 text-zinc-600 font-semibold uppercase text-[10px]">
                  <th className="py-2">Item Description</th>
                  <th className="py-2 font-mono">HSN</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit Rate</th>
                  <th className="py-2 text-right">Taxable</th>
                  <th className="py-2 text-right">GST</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(order.items || []).map((item, idx) => {
                  const taxAmt = item.taxAmount?.total || 0;
                  return (
                    <tr key={idx} className="text-zinc-800">
                      <td className="py-2.5 pr-2">
                        <p className="font-medium text-zinc-900">{item.title}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          SKU: {item.sku} | {item.color} / {item.size}
                        </p>
                      </td>
                      <td className="py-2.5 font-mono text-zinc-600">{item.hsnCode || "6109"}</td>
                      <td className="py-2.5 text-right font-medium">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono">{formatINR(item.unitPrice)}</td>
                      <td className="py-2.5 text-right font-mono">{formatINR(item.subtotal)}</td>
                      <td className="py-2.5 text-right font-mono">
                        {formatINR(taxAmt)} ({item.gstRate || 5}%)
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold">
                        {formatINR(item.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end pt-4 border-t-2 border-zinc-900">
            <div className="w-64 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal (Taxable Value):</span>
                <span className="font-mono">{formatINR(pricing.subtotal || 0)}</span>
              </div>
              {pricing.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount {pricing.couponCode ? `(${pricing.couponCode})` : ""}:</span>
                  <span className="font-mono">-{formatINR(pricing.discountAmount)}</span>
                </div>
              )}
              {pricing.taxBreakdown?.cgstTotal > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>CGST:</span>
                  <span className="font-mono">{formatINR(pricing.taxBreakdown.cgstTotal)}</span>
                </div>
              )}
              {pricing.taxBreakdown?.sgstTotal > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>SGST:</span>
                  <span className="font-mono">{formatINR(pricing.taxBreakdown.sgstTotal)}</span>
                </div>
              )}
              {pricing.taxBreakdown?.igstTotal > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>IGST:</span>
                  <span className="font-mono">{formatINR(pricing.taxBreakdown.igstTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>Shipping & Handling:</span>
                <span className="font-mono">
                  {pricing.shippingFee > 0 ? formatINR(pricing.shippingFee) : "FREE"}
                </span>
              </div>
              {pricing.codFee > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>COD Collection Fee:</span>
                  <span className="font-mono">{formatINR(pricing.codFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t pt-2 text-zinc-950">
                <span>Grand Total (INR):</span>
                <span className="font-mono text-base">{formatINR(pricing.grandTotal || 0)}</span>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="border-t pt-6 text-[10px] text-zinc-500 space-y-1">
            <p className="font-semibold text-zinc-700">Declaration & Terms:</p>
            <p>
              1. This is a computer-generated tax invoice issued in compliance with the Central Goods
              and Services Tax (CGST) Act, 2017. No physical signature is required.
            </p>
            <p>
              2. Goods once sold can be returned within 14 days of delivery in unworn condition with
              original security tags intact.
            </p>
            <p>
              3. For customer support or return requests, write to support@voguethreads.in with your
              Order Number.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
