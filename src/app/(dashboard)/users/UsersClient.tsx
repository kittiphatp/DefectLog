"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { AppUser } from "@/lib/types";
import { Users, Shield, User, CheckCircle, XCircle } from "lucide-react";

interface UsersClientProps {
  users: AppUser[];
  currentUserId: string;
}

export default function UsersClient({ users, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const supabase = getSupabase();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const updateRole = async (userId: string, role: "admin" | "user") => {
    setLoading(userId + "role");
    setError("");
    await supabase.rpc("update_user_role", { p_user_id: userId, p_role: role });
    setLoading(null);
    router.refresh();
  };

  const toggleActive = async (userId: string, isActive: boolean) => {
    setLoading(userId + "active");
    setError("");
    await supabase.rpc("update_user_active", { p_user_id: userId, p_is_active: !isActive });
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 text-sm">{users.length} users registered</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      <div className="section-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Joined</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800">{user.email}</span>
                        {isSelf && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">You</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {user.role === "admin" ? <Shield className="w-3.5 h-3.5 text-blue-600" /> : <User className="w-3.5 h-3.5 text-gray-400" />}
                        <span className={`capitalize font-medium ${user.role === "admin" ? "text-blue-700" : "text-gray-600"}`}>{user.role}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {user.is_active
                          ? <><CheckCircle className="w-4 h-4 text-green-500" /><span className="text-green-700 text-xs font-medium">Active</span></>
                          : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-600 text-xs font-medium">Inactive</span></>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4">
                      {!isSelf && (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => updateRole(user.id, user.role === "admin" ? "user" : "admin")}
                            disabled={!!loading}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                              user.role === "admin" ? "border-gray-300 text-gray-600 hover:bg-gray-50" : "border-blue-300 text-blue-700 hover:bg-blue-50"
                            }`}
                          >
                            {loading === user.id + "role" ? "..." : user.role === "admin" ? "Set User" : "Set Admin"}
                          </button>
                          <button
                            onClick={() => toggleActive(user.id, user.is_active)}
                            disabled={!!loading}
                            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50 ${
                              user.is_active ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-700 hover:bg-green-50"
                            }`}
                          >
                            {loading === user.id + "active" ? "..." : user.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
