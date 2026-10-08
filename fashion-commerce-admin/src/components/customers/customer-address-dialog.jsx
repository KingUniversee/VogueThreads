"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { isValidPinCode } from "@/lib/formatters";

export function CustomerAddressDialog({ open, onOpenChange, customerId, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    type: "SHIPPING",
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Street address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.postalCode.trim()) {
      newErrors.postalCode = "PIN Code is required";
    } else if (!isValidPinCode(formData.postalCode.trim())) {
      newErrors.postalCode = "Enter a valid 6-digit Indian PIN code";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          postalCode: formData.postalCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add address");
      }

      toast.success("Address added successfully");
      onOpenChange(false);
      setFormData({
        name: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        type: "SHIPPING",
        isDefault: false,
      });
      if (onSuccess) onSuccess(data.addresses);
    } catch (err) {
      console.error("Add address error:", err);
      toast.error(err.message || "Failed to add address");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Customer Address</DialogTitle>
          <DialogDescription>
            Record a new shipping or billing address for this customer profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Recipient Name *</label>
              <Input
                placeholder="Aarav Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={submitting}
              />
              {errors.name && <p className="text-[11px] text-rose-600">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
              <Input
                placeholder="9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={submitting}
              />
              {errors.phone && <p className="text-[11px] text-rose-600">{errors.phone}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Address Line 1 *</label>
            <Input
              placeholder="Flat 402, High-rise Towers, Park Avenue"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              disabled={submitting}
            />
            {errors.addressLine1 && (
              <p className="text-[11px] text-rose-600">{errors.addressLine1}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Address Line 2 (Optional)</label>
            <Input
              placeholder="Near Metro Station, Landmark"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">City *</label>
              <Input
                placeholder="Bengaluru"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={submitting}
              />
              {errors.city && <p className="text-[11px] text-rose-600">{errors.city}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">State *</label>
              <Input
                placeholder="Karnataka"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={submitting}
              />
              {errors.state && <p className="text-[11px] text-rose-600">{errors.state}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">PIN Code *</label>
              <Input
                placeholder="560001"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                disabled={submitting}
                maxLength={6}
              />
              {errors.postalCode && (
                <p className="text-[11px] text-rose-600">{errors.postalCode}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Address Type</label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHIPPING">Shipping Only</SelectItem>
                  <SelectItem value="BILLING">Billing Only</SelectItem>
                  <SelectItem value="BOTH">Shipping & Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 bg-slate-50/50 mt-5">
              <span className="text-xs font-medium text-slate-700">Set as Default</span>
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                disabled={submitting}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
