import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, Database, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ModulePlaceholder({
  title,
  moduleNumber,
  targetPhase,
  description,
  plannedFeatures = [],
  actions,
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        badge={
          <Badge variant="info" dot={true}>
            Module {moduleNumber} • Phase {targetPhase}
          </Badge>
        }
        actions={
          actions || (
            <Button variant="outline" size="sm" asChild>
              <Link href="/" className="flex items-center gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Dashboard</span>
              </Link>
            </Button>
          )
        }
      />

      <Card className="border-dashed border-slate-300 bg-slate-50/50 p-8 text-center sm:text-left">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {title} Architecture Mapped
              </h2>
              <p className="text-xs text-slate-500">
                Data model, schema, and routing structure established in Phase 1 foundation.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-white border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-800">
              Specification Planned for Phase {targetPhase}:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              {plannedFeatures.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span>Mongoose Model Ready</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>RBAC Protected</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Upcoming Phase</span>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
