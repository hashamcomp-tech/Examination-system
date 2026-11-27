"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, GraduationCap, Shield } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(d => {
      setUsers(d.users || []);
      const admins = d.users?.filter((u: any) => u.role === "ADMIN").length || 0;
      const examiners = d.users?.filter((u: any) => u.role === "EXAMINER").length || 0;
      const candidates = d.users?.filter((u: any) => u.role === "CANDIDATE").length || 0;
      setStats({ total: d.users?.length || 0, admins, examiners, candidates });
    });
  }, []);

  const statCards = [
    { title: "Total Users", value: stats?.total || 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { title: "Administrators", value: stats?.admins || 0, icon: Shield, color: "text-purple-600 bg-purple-50" },
    { title: "Examiners", value: stats?.examiners || 0, icon: FileText, color: "text-emerald-600 bg-emerald-50" },
    { title: "Candidates", value: stats?.candidates || 0, icon: GraduationCap, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Users</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {users.slice(0, 10).map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="py-3 text-gray-600">{u.email}</td>
                    <td className="py-3"><Badge variant={u.role === "ADMIN" ? "purple" : u.role === "EXAMINER" ? "default" : "secondary"}>{u.role}</Badge></td>
                    <td className="py-3"><Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "Active" : "Inactive"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
