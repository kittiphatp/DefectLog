"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ClipboardList, Users, LogOut, Bug, KeyRound } from "lucide-react";
import { SessionUser } from "@/lib/auth";

interface SidebarProps {
  user: SessionUser;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/defects", label: "Defect List", icon: ClipboardList },
];

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/defects") return pathname.startsWith("/defects");
    return pathname === href;
  };

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">Defect Log</p>
            <p className="text-blue-300 text-xs">Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-blue-700 text-white"
                : "text-blue-200 hover:bg-blue-800 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}

        {user.role === "admin" && (
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-xs font-semibold text-blue-400 uppercase tracking-wider">Admin</p>
            </div>
            <Link href="/users"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/users"
                  ? "bg-blue-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </Link>
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-blue-800">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-blue-300">Signed in as</p>
          <p className="text-sm font-medium text-white truncate">{user.email}</p>
          <span className="text-xs text-blue-400 capitalize">{user.role}</span>
        </div>
        <Link href="/profile"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
            pathname === "/profile"
              ? "bg-blue-700 text-white"
              : "text-blue-200 hover:bg-blue-800 hover:text-white"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Change Password
        </Link>
        <button onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-blue-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
