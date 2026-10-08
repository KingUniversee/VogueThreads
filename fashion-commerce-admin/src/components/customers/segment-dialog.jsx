"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Sliders } from "lucide-react";

const AVAILABLE_FIELDS = [
  { id: "totalSpend", label: "Total Spend (₹)" },
  { id: "orderCount", label: "Total Orders Count" },
  { id: "avgOrderValue", label: "Average Order Value (₹)" },
  { id: "lastOrderDays", label: "Days Since Last Order" },
  { id: "joinedDays", label: "Days Since Account Created" },
];

const AVAILABLE_OPERATORS = [
  { id: "greater_than", label: "Greater Than (>)" },
  { id: "greater_than_or_equal", label: "Greater Than or Equal (≥)" },
  { id: "less_than", label: "Less Than (<)" },
  { id: "less_than_or_equal", label: "Less Than or Equal (≤)" },
  { id: "equals", label: "Equals (=)" },
  { id: "within_days", label: "Within Days" },
];

export function SegmentDialog({ open, onOpenChange, segment = null, onSuccess }) {
  const isEditing = Boolean(segment?._id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("RULE_BASED");
  const [matchType, setMatchType] = useState("ALL");
  const [rules, setRules] = useState([
    { field: "totalSpend", operator: "greater_than", value: 5000 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (segment) {
      setName(segment.name || "");
      setDescription(segment.description || "");
      setType(segment.type || "RULE_BASED");
      setMatchType(segment.matchType || "ALL");
      setRules(
        segment.rules && segment.rules.length > 0
          ? segment.rules.map((r) => ({
              field: r.field || "totalSpend",
              operator: r.operator || "greater_than",
              value: r.value ?? "",
            }))
          : [{ field: "totalSpend", operator: "greater_than", value: 5000 }]
      );
    } else {
      setName("");
      setDescription("");
      setType("RULE_BASED");
      setMatchType("ALL");
      setRules([{ field: "totalSpend", operator: "greater_than", value: 5000 }]);
    }
    setErrors({});
  }, [segment, open]);

  const handleAddRule = () => {
    setRules([
      ...rules,
      { field: "orderCount", operator: "greater_than_or_equal", value: 2 },
    ]);
  };

  const handleRemoveRule = (index) => {
    if (rules.length <= 1) {
      toast.error("At least one rule is required for rule-based segments");
      return;
    }
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index, key, val) => {
    const updated = [...rules];
    updated[index][key] = val;
    setRules(updated);
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Segment name is required";

    if (type === "RULE_BASED") {
      if (!rules || rules.length === 0) {
        newErrors.rules = "At least one condition rule is required";
      } else {
        for (let i = 0; i < rules.length; i++) {
          const r = rules[i];
          if (r.value === "" || isNaN(Number(r.value))) {
            newErrors.rules = `Rule ${i + 1} requires a valid numeric value`;
            break;
          }
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        type,
      };

      if (type === "RULE_BASED") {
        payload.matchType = matchType;
        payload.rules = rules.map((r) => ({
          field: r.field,
          operator: r.operator,
          value: Number(r.value),
        }));
      }

      const url = isEditing ? `/api/segments/${segment._id}` : `/api/segments`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save segment");
      }

      toast.success(isEditing ? "Segment updated successfully" : "Segment created successfully");
      onOpenChange(false);
      if (onSuccess) onSuccess(data.segment);
    } catch (err) {
      console.error("Save segment error:", err);
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer Segment" : "Create Customer Segment"}</DialogTitle>
          <DialogDescription>
            Group customers automatically via dynamic RFM rules or manually maintain specific cohort lists.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Segment Name *</label>
            <Input
              placeholder="e.g. VIP High Rollers (Spend > ₹10,000)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
            {errors.name && <p className="text-[11px] text-rose-600">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Description</label>
            <Textarea
              placeholder="Brief description of who belongs in this segment and marketing use cases..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none text-xs"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Segment Type</label>
              <Select
                value={type}
                onValueChange={(val) => setType(val)}
                disabled={submitting || isEditing}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RULE_BASED">Dynamic (Rule-Based)</SelectItem>
                  <SelectItem value="MANUAL">Static (Manual Selection)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "RULE_BASED" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Condition Match</label>
                <Select
                  value={matchType}
                  onValueChange={(val) => setMatchType(val)}
                  disabled={submitting}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Match ALL Rules (AND)</SelectItem>
                    <SelectItem value="ANY">Match ANY Rule (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Rule Builder */}
          {type === "RULE_BASED" && (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-slate-500" />
                  Cohort Evaluation Rules
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  disabled={submitting}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Rule
                </Button>
              </div>

              {errors.rules && <p className="text-[11px] text-rose-600">{errors.rules}</p>}

              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs"
                  >
                    <div className="flex-1 min-w-[140px]">
                      <Select
                        value={rule.field}
                        onValueChange={(val) => handleRuleChange(idx, "field", val)}
                        disabled={submitting}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FIELDS.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[130px]">
                      <Select
                        value={rule.operator}
                        onValueChange={(val) => handleRuleChange(idx, "operator", val)}
                        disabled={submitting}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_OPERATORS.map((op) => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-[80px]">
                      <Input
                        type="number"
                        placeholder="Val"
                        value={rule.value}
                        onChange={(e) => handleRuleChange(idx, "value", e.target.value)}
                        className="h-8 text-xs px-2"
                        disabled={submitting}
                      />
                    </div>

                    {rule.operator === "BETWEEN" && (
                      <div className="w-[80px]">
                        <Input
                          type="number"
                          placeholder="Max"
                          value={rule.value2}
                          onChange={(e) => handleRuleChange(idx, "value2", e.target.value)}
                          className="h-8 text-xs px-2"
                          disabled={submitting}
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRule(idx)}
                      disabled={submitting}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
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
              {isEditing ? "Save Changes" : "Create Segment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
