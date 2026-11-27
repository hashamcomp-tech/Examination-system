"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Search, UserPlus } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "CANDIDATE" });
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadUsers = () => {
    fetch("/api/admin/users").then(r => r.json()).then(d => setUsers(d.users || []));
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      toast("User created", "success");
      setShowCreate(false);
      setNewUser({ name: "", email: "", password: "", role: "CANDIDATE" });
      loadUsers();
    } else {
      const data = await res.json();
      toast(data.error || "Failed", "error");
    }
    setLoading(false);
  };

  const toggleActive = async (user: any) => {
    const nextState = !user.is_active;
    const confirmMsg = nextState
      ? `Activate account for ${user.name}? They will be allowed to log in.`
      : `Are you sure you want to deactivate ${user.name}? They will be blocked from logging in.`;
    if (!confirm(confirmMsg)) return;

    setTogglingId(user.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isActive: nextState }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(data.message || `User account ${nextState ? "activated" : "deactivated"}`, "success");
        loadUsers();
      } else {
        toast(data.error || "Failed to update user status", "error");
      }
    } catch {
      toast("Network error updating user status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">{users.length} total users</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}><UserPlus className="h-4 w-4" /> Add User</Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Create New User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <Input placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              <Input placeholder="Password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              <Select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="CANDIDATE">Candidate</option>
                <option value="EXAMINER">Examiner</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreate} loading={loading}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-10" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select className="w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="EXAMINER">Examiner</option>
              <option value="CANDIDATE">Candidate</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500">
              <th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th>
              <th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${!u.is_active ? "bg-rose-50/20" : ""}`}>
                  <td className="py-3 font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={u.is_active ? "text-gray-900" : "text-gray-500 line-through"}>{u.name}</span>
                      {!u.is_active && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                          Deactivated
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">{u.email}</td>
                  <td className="py-3"><Badge variant={u.role === "ADMIN" ? "purple" : u.role === "EXAMINER" ? "default" : "secondary"}>{u.role}</Badge></td>
                  <td className="py-3">
                    <Badge variant={u.is_active ? "success" : "destructive"}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Button
                      size="sm"
                      variant={u.is_active ? "ghost" : "outline"}
                      className={u.is_active ? "text-rose-700 hover:text-rose-800 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-medium"}
                      onClick={() => toggleActive(u)}
                      loading={togglingId === u.id}
                    >
                      {u.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
