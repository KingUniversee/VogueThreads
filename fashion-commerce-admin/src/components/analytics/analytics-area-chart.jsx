"use client";

import React, { useState, useId } from "react";
import { formatINR, formatNumberIN } from "@/lib/formatters";

export function AnalyticsAreaChart({
  points = [],
  title,
  subtitle,
  height = 240,
  valueFormatter = formatINR,
  primaryKey = "revenue",
  primaryLabel = "Revenue",
  secondaryKey = "orders",
  secondaryLabel = "Orders",
  accentColor = "#0f172a", // slate-900 default
  fillGradientStart = "#3b82f6",
  fillGradientEnd = "#93c5fd",
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const gradientId = useId();

  const chartWidth = 720;
  const paddingX = 45;
  const paddingY = 30;

  const validPoints = Array.isArray(points) ? points : [];
  const maxVal = Math.max(...validPoints.map((p) => Number(p[primaryKey]) || 0), 10);

  // Coordinate mapping
  const coordinates = validPoints.map((p, idx) => {
    const val = Number(p[primaryKey]) || 0;
    const x =
      validPoints.length > 1
        ? paddingX + (idx / (validPoints.length - 1)) * (chartWidth - 2 * paddingX)
        : chartWidth / 2;
    const y =
      height - paddingY - (val / maxVal) * (height - 2 * paddingY);
    return { x, y, raw: p };
  });

  const pathD =
    coordinates.length > 0
      ? coordinates.reduce((acc, curr, idx) => {
          if (idx === 0) return `M ${curr.x} ${curr.y}`;
          const prev = coordinates[idx - 1];
          const cx = (prev.x + curr.x) / 2;
          return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
        }, "")
      : "";

  const areaD =
    coordinates.length > 0
      ? `${pathD} L ${coordinates[coordinates.length - 1].x} ${
          height - paddingY
        } L ${coordinates[0].x} ${height - paddingY} Z`
      : "";

  const activePoint = hoveredIdx !== null && coordinates[hoveredIdx] ? coordinates[hoveredIdx] : null;

  // Generate 4 Y-axis ticks
  const yTicks = [0, 0.33, 0.66, 1].map((ratio) => {
    const val = maxVal * ratio;
    const y = height - paddingY - ratio * (height - 2 * paddingY);
    return { val, y };
  });

  if (validPoints.length === 0) {
    return (
      <div className="w-full bg-white rounded-lg border border-slate-200 p-6">
        {title && <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>}
        {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
        <div className="h-48 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No analytics data recorded for this time interval.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          {title && <h3 className="text-sm font-semibold text-slate-900">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {activePoint && (
          <div className="flex items-center gap-3 text-xs bg-slate-50 px-2.5 py-1 rounded border border-slate-200 self-start">
            <span className="font-semibold text-slate-700">{activePoint.raw.label || activePoint.raw.date}</span>
            <span className="text-slate-400">•</span>
            <span className="font-medium text-slate-900">
              {primaryLabel}: {valueFormatter(activePoint.raw[primaryKey] || 0)}
            </span>
            {secondaryKey && activePoint.raw[secondaryKey] !== undefined && (
              <>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">
                  {secondaryLabel}: {formatNumberIN(activePoint.raw[secondaryKey] || 0)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={`chart-grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillGradientStart} stopOpacity="0.25" />
              <stop offset="100%" stopColor={fillGradientEnd} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-ticks */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingX}
                y1={tick.y}
                x2={chartWidth - paddingX}
                y2={tick.y}
                stroke="#e2e8f0"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={paddingX - 8}
                y={tick.y + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {tick.val >= 1000 ? `₹${(tick.val / 1000).toFixed(0)}k` : `₹${Math.round(tick.val)}`}
              </text>
            </g>
          ))}

          {/* Area & Path */}
          {areaD && <path d={areaD} fill={`url(#chart-grad-${gradientId})`} />}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={accentColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover highlight guide & circles */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={paddingY}
                x2={activePoint.x}
                y2={height - paddingY}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                strokeWidth="1.5"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5.5"
                fill={accentColor}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Interactive touch targets */}
          {coordinates.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - chartWidth / (coordinates.length * 2 || 1)}
              y={paddingY}
              width={chartWidth / (coordinates.length || 1)}
              height={height - 2 * paddingY}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}

          {/* X Axis labels (sample up to 6 evenly) */}
          {coordinates.map((pt, idx) => {
            const step = Math.max(1, Math.floor(coordinates.length / 6));
            if (idx % step !== 0 && idx !== coordinates.length - 1) return null;
            return (
              <text
                key={idx}
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-sans"
              >
                {pt.raw.label || pt.raw.date}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
