import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";

/**
 * Custom Tooltip with Zyphor styling.
 */
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md dark:border-slate-800 dark:bg-slate-900 text-xs">
        <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-zyphor-indigo-600 dark:text-zyphor-indigo-400 font-medium">
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Score distribution histogram/bar chart.
 */
export function ScoreDistributionChart({ data, height = 260 }) {
  if (!data || !data.length) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-slate-400">
        No score distribution data available.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Participants" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Submission activity timeline chart.
 */
export function SubmissionActivityChart({ data, height = 260 }) {
  if (!data || !data.length) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-slate-400">
        No timeline data available.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#cbd5e1" }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="submissions"
            name="Submissions"
            stroke="#4f46e5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#submissionGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
