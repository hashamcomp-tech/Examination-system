"use client";

import React, { useEffect, useState, Suspense } from "react";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  role: string;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Suspense fallback={<div className="w-64 bg-white border-r border-gray-200" />}>
        <Sidebar
          role={role}
          userName={user?.name || "User"}
          userEmail={user?.email || ""}
        />
      </Suspense>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Suspense fallback={<div className="p-8 animate-pulse text-gray-500">Loading...</div>}>
            {children}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
