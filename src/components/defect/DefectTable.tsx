"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { Defect, DefectStatus, STATUS_COLORS, PRIORITY_COLORS, Priority } from "@/lib/types";
import { SessionUser } from "@/lib/auth";
import { UserCheck, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface DefectTableProps {
  defects: Defect[];
  currentUser: SessionUser;
}

export default function DefectTable({ defects, currentUser }: DefectTableProps) {
  const supabase = getSupabase();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const openIds = defects.filter((d) => d.status === "Open").map((d) => d.id);
  const allChecked = openIds.length > 0 && openIds.every((id) => selected.has(id));
  const indeterminate = !allChecked && openIds.some((id) => selected.has(id));

  const toggleAll = () => {
    setSelected(allChecked ? new Set() : new Set(openIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const assignToMe = useCallback(async () => {
    if (selected.size === 0) return;
    setLoading(true);
    await supabase
      .from("defects")
      .update({ assigned_to: currentUser.id, status: "In Progress" })
      .in("id", Array.from(selected));
    setLoading(false);
    setSelected(new Set());
    window.location.reload();
  }, [selected, currentUser.id, supabase]);

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sortedDefects = useMemo(() => {
    return [...defects].sort((a: any, b: any) => {
      let va: any, vb: any;
      if (sortCol === "assigned_user_email") { va = a.assigned_user?.email ?? ""; vb = b.assigned_user?.email ?? ""; }
      else if (sortCol === "users_email") { va = a.users?.email ?? ""; vb = b.users?.email ?? ""; }
      else { va = a[sortCol] ?? ""; vb = b[sortCol] ?? ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [defects, sortCol, sortDir]);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <>
      {/* Assign to me bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-blue-700 font-medium">{selected.size} รายการที่เลือก</span>
          <button
            onClick={assignToMe}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {loading ? "กำลังบันทึก..." : "Assign to me"}
          </button>
        </div>
      )}

      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  {openIds.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  )}
                </th>
                <th onClick={() => handleSort("docno")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Doc No. <SortIcon col="docno" /></div>
                </th>
                <th onClick={() => handleSort("subject")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Subject <SortIcon col="subject" /></div>
                </th>
                <th onClick={() => handleSort("module")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Module <SortIcon col="module" /></div>
                </th>
                <th onClick={() => handleSort("priority")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Priority <SortIcon col="priority" /></div>
                </th>
                <th onClick={() => handleSort("status")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Status <SortIcon col="status" /></div>
                </th>
                <th onClick={() => handleSort("assigned_user_email")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Assigned To <SortIcon col="assigned_user_email" /></div>
                </th>
                <th onClick={() => handleSort("users_email")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Created By <SortIcon col="users_email" /></div>
                </th>
                <th onClick={() => handleSort("created_at")} className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100">
                  <div className="flex items-center gap-1">Created <SortIcon col="created_at" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {defects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-gray-400">
                    <p className="font-medium">No defects found</p>
                    <p className="text-xs mt-1">
                      <Link href="/defects/new" className="text-blue-600 hover:underline">
                        Create the first defect
                      </Link>
                    </p>
                  </td>
                </tr>
              ) : (
                sortedDefects.map((defect) => (
                  <tr
                    key={defect.id}
                    className={`hover:bg-gray-50 transition-colors ${selected.has(defect.id) ? "bg-blue-50" : ""}`}
                  >
                    <td className="px-4 py-4">
                      {defect.status === "Open" && (
                        <input
                          type="checkbox"
                          checked={selected.has(defect.id)}
                          onChange={() => toggleOne(defect.id)}
                          className="rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/defects/${defect.id}`}
                        className="text-blue-700 font-mono font-medium hover:underline"
                      >
                        {defect.docno}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-gray-800 max-w-xs truncate">
                      {defect.subject || <span className="text-gray-400 italic">No subject</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {defect.module || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {defect.priority
                        ? <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[defect.priority as Priority]}`}>{defect.priority}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[defect.status as DefectStatus]}`}>
                        {defect.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      {defect.assigned_user?.email ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      {defect.users?.email ?? "-"}
                    </td>
                    <td className="px-4 py-4 text-gray-500">
                      {new Date(defect.created_at).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
