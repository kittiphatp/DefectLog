import { getSupabase } from "@/lib/supabase";
import { DefectStatus, STATUS_COLORS } from "@/lib/types";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import DefectChart from "@/components/dashboard/DefectChart";

const STATUS_ORDER: DefectStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
  "Completed",
  "Draft",
  "Rejected",
  "Cancelled",
  "Reopen",
];

export default async function DashboardPage() {
  const supabase = getSupabase();

  const { data: defects } = await supabase
    .from("defects")
    .select("status, created_at")
    .order("created_at", { ascending: true });

  const total = defects?.length ?? 0;

  const statusCounts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = defects?.filter((d) => d.status === s).length ?? 0;
    return acc;
  }, {});

  const statsCards = [
    { label: "Total Defects", value: total, color: "bg-blue-600", textColor: "text-white" },
    { label: "Open", value: statusCounts["Open"], color: "bg-blue-50", textColor: "text-blue-700" },
    { label: "In Progress", value: statusCounts["In Progress"], color: "bg-yellow-50", textColor: "text-yellow-700" },
    { label: "Resolved", value: statusCounts["Resolved"], color: "bg-green-50", textColor: "text-green-700" },
    { label: "Completed", value: statusCounts["Completed"], color: "bg-emerald-50", textColor: "text-emerald-700" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-6 h-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">Defect summary overview</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {statsCards.map(({ label, value, color, textColor }) => (
          <div key={label} className={`${color} rounded-xl p-5 shadow-sm`}>
            <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
            <p className={`text-sm mt-1 ${label === "Total Defects" ? "text-blue-100" : "text-gray-600"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="font-semibold text-gray-700">Status Breakdown</h2>
        </div>
        <div className="p-6">
          {total === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg font-medium">No defects yet</p>
              <p className="text-sm mt-1">
                <Link href="/defects/new" className="text-blue-600 hover:underline">
                  Create your first defect
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = statusCounts[status];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className="w-28 flex-shrink-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                        {status}
                      </span>
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-20 text-right flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-700">{count}</span>
                      <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6">
        <DefectChart defects={defects ?? []} />
      </div>

      {/* Quick action */}
      <div className="mt-6 flex gap-3">
        <Link href="/defects/new" className="btn-primary">
          + New Defect
        </Link>
        <Link href="/defects" className="btn-secondary">
          View All Defects
        </Link>
      </div>
    </div>
  );
}
