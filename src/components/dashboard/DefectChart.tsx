"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { DefectStatus, STATUS_COLORS } from "@/lib/types";

type Period = "day" | "month" | "year";

interface RawDefect {
  created_at: string;
  status: DefectStatus;
}

interface DefectChartProps {
  defects: RawDefect[];
}

const STATUS_LIST: DefectStatus[] = [
  "Open", "In Progress", "Resolved", "Completed", "Draft", "Rejected", "Cancelled", "Reopen",
];

const BAR_COLORS: Record<DefectStatus, string> = {
  Open:          "#3b82f6",
  "In Progress": "#f59e0b",
  Resolved:      "#10b981",
  Completed:     "#059669",
  Draft:         "#9ca3af",
  Rejected:      "#ef4444",
  Cancelled:     "#6b7280",
  Reopen:        "#8b5cf6",
};

function formatKey(date: Date, period: Period): string {
  if (period === "day") {
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  if (period === "month") {
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  return String(date.getFullYear());
}

export default function DefectChart({ defects }: DefectChartProps) {
  const [period, setPeriod] = useState<Period>("month");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<DefectStatus>>(
    new Set(STATUS_LIST)
  );

  const toggleStatus = (s: DefectStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) { next.delete(s); } else { next.add(s); }
      return next;
    });
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let buckets: string[] = [];

    if (period === "day") {
      // Last 31 days
      for (let i = 30; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        buckets.push(formatKey(d, "day"));
      }
    } else if (period === "month") {
      // All 12 months of current year
      for (let m = 0; m < 12; m++) {
        const d = new Date(now.getFullYear(), m, 1);
        buckets.push(formatKey(d, "month"));
      }
    } else {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear() - i, 0, 1);
        buckets.push(formatKey(d, "year"));
      }
    }

    // Initialize all buckets with 0
    const map = new Map<string, Record<DefectStatus, number>>();
    buckets.forEach((key) => {
      const empty = {} as Record<DefectStatus, number>;
      STATUS_LIST.forEach((s) => (empty[s] = 0));
      map.set(key, empty);
    });

    // Fill with actual data
    defects.forEach(({ created_at, status }) => {
      const key = formatKey(new Date(created_at), period);
      if (map.has(key)) {
        map.get(key)![status] = (map.get(key)![status] ?? 0) + 1;
      }
    });

    return buckets.map((name) => ({ name, ...map.get(name)! }));
  }, [defects, period]);

  const activeStatuses = STATUS_LIST.filter((s) => selectedStatuses.has(s));

  return (
    <div className="section-card">
      <div className="section-header flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Defect Trend</h2>
        {/* Period selector */}
        <div className="flex gap-1">
          {(["day", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p === "day" ? "Day" : p === "month" ? "Month" : "Year"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Status filter */}
        <div className="flex flex-wrap gap-2 mb-5">
          {STATUS_LIST.map((s) => {
            const active = selectedStatuses.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? STATUS_COLORS[s] + " border-transparent"
                    : "bg-white text-gray-400 border-gray-200"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: active ? BAR_COLORS[s] : "#d1d5db" }}
                />
                {s}
              </button>
            );
          })}
        </div>

        {chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No data to display</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                cursor={{ fill: "#f9fafb" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              {activeStatuses.map((s) => (
                <Bar key={s} dataKey={s} stackId="a" fill={BAR_COLORS[s]} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
