import { getSession } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { DefectStatus, MODULE_OPTIONS, PRIORITY_OPTIONS } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import DefectTable from "@/components/defect/DefectTable";

const ALL_STATUSES: DefectStatus[] = [
  "Draft", "Open", "In Progress", "Resolved", "Completed", "Rejected", "Cancelled", "Reopen"
];

export default async function DefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; module?: string; priority?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");

  const supabase = getSupabase();
  const params = await searchParams;
  const statusFilter  = params?.status   || "";
  const query         = params?.q        || "";
  const moduleFilter  = params?.module   || "";
  const priorityFilter = params?.priority || "";

  let dbQuery = supabase
    .from("defects")
    .select("*, users!defects_created_by_fkey(email), assigned_user:users!defects_assigned_to_fkey(email)")
    .order("created_at", { ascending: false });

  if (user.role !== "admin") {
    dbQuery = dbQuery.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
  }

  if (statusFilter)   dbQuery = dbQuery.eq("status", statusFilter);
  if (moduleFilter)   dbQuery = dbQuery.eq("module", moduleFilter);
  if (priorityFilter) dbQuery = dbQuery.eq("priority", priorityFilter);

  if (query) {
    const { data: matchedUsers } = await supabase
      .from("users").select("id").ilike("email", `%${query}%`);
    const userIds = matchedUsers?.map((u: { id: string }) => u.id) ?? [];
    if (userIds.length > 0) {
      dbQuery = dbQuery.or(`subject.ilike.%${query}%,assigned_to.in.(${userIds.join(",")})`);
    } else {
      dbQuery = dbQuery.ilike("subject", `%${query}%`);
    }
  }

  const { data: defects } = await dbQuery;

  // Build preserve-params helper
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (query)          p.set("q", query);
    if (moduleFilter)   p.set("module", moduleFilter);
    if (priorityFilter) p.set("priority", priorityFilter);
    Object.entries(extra).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-blue-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Defect List</h1>
            <p className="text-gray-500 text-sm">{defects?.length ?? 0} records</p>
          </div>
        </div>
        <Link href="/defects/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Defect
        </Link>
      </div>

      {/* Filters */}
      <div className="section-card mb-4">
        <div className="p-4 space-y-3">
          {/* Search + dropdowns */}
          <form className="flex flex-wrap gap-2 items-center" method="GET">
            {statusFilter   && <input type="hidden" name="status"   value={statusFilter} />}
            <input
              type="text" name="q" defaultValue={query}
              placeholder="Search subject or assigned to..."
              className="input-field flex-1 min-w-48 max-w-sm"
            />
            <select name="module" defaultValue={moduleFilter} className="input-field w-44">
              <option value="">All Modules</option>
              {MODULE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select name="priority" defaultValue={priorityFilter} className="input-field w-36">
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="submit" className="btn-secondary px-4">Search</button>
            {(query || moduleFilter || priorityFilter) && (
              <Link href={statusFilter ? `/defects?status=${statusFilter}` : "/defects"} className="text-xs text-gray-400 hover:text-gray-600">
                Clear
              </Link>
            )}
          </form>

          {/* Status tabs */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/defects${qs({ status: "" })}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${!statusFilter ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
              All
            </Link>
            {ALL_STATUSES.map((s) => (
              <Link key={s} href={`/defects${qs({ status: s })}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? "bg-blue-700 text-white border-blue-700" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <DefectTable defects={(defects as never) ?? []} currentUser={user} />
    </div>
  );
}
