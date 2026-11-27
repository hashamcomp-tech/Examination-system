"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Settings, FileText, BookOpen,
  Monitor, BarChart3, LogOut, Menu, X, ClipboardList,
  GraduationCap, AlertTriangle, HelpCircle, ChevronLeft,
  UploadCloud, PieChart,
} from "lucide-react";

interface SidebarProps {
  role: string;
  userName: string;
  userEmail: string;
}

const navItems: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
  ],
  EXAMINER: [
    { label: "Dashboard", href: "/examiner", icon: LayoutDashboard },
    { label: "Exams", href: "/examiner/exams", icon: FileText },
    { label: "Question Bank", href: "/examiner/questions", icon: BookOpen },
    { label: "Analytics", href: "/examiner/questions/analytics", icon: PieChart },
    { label: "Bulk Import", href: "/examiner/import", icon: UploadCloud },
    { label: "Monitoring", href: "/examiner/monitoring", icon: Monitor },
    { label: "Results", href: "/examiner/results", icon: BarChart3 },
    { label: "Disputes", href: "/examiner/disputes", icon: AlertTriangle },
  ],
  CANDIDATE: [
    { label: "Dashboard", href: "/candidate", icon: LayoutDashboard },
    { label: "My Exams", href: "/candidate/exams", icon: ClipboardList },
    { label: "Results", href: "/candidate/results", icon: GraduationCap },
    { label: "Disputes", href: "/candidate/disputes", icon: HelpCircle },
  ],
};

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const items = navItems[role] || [];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const nav = (
    <div className={cn("flex flex-col h-full", collapsed ? "w-16" : "w-64")}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-200">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Examina</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hidden lg:flex"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${role.toLowerCase()}` && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        "lg:hidden fixed inset-y-0 left-0 z-40 bg-white shadow-xl transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {nav}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-screen bg-white border-r border-gray-200 shrink-0">
        {nav}
      </div>
    </>
  );
}
