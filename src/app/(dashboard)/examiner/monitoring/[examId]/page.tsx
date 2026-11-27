"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { Send, AlertTriangle, RefreshCw, Info } from "lucide-react";

export default function MonitorExamPage() {
  const params = useParams();
  const examId = params.examId as string;
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const { toast } = useToast();

  const load = useCallback(() => {
    fetch(`/api/monitoring/${examId}`).then(r => r.json()).then(d => setData(d));
  }, [examId]);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  if (!data) return <div className="animate-pulse p-8">Loading monitoring data...</div>;

  const activeAttempts = data.attempts?.filter((a: any) => a.status === "IN_PROGRESS") || [];
  const completedAttempts = data.attempts?.filter((a: any) => a.status !== "IN_PROGRESS") || [];

  const sendAnnouncement = async () => {
    if (!message.trim()) return;
    await fetch("/api/announcements", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, message, priority }),
    });
    toast("Announcement sent", "success");
    setMessage("");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.exam?.title}</h1>
          <p className="text-gray-500 mt-1">Live Monitoring · {activeAttempts.length} active, {completedAttempts.length} completed</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> Monitoring indicators are observational tools and must NOT be treated as conclusive evidence of misconduct.
          They are for awareness purposes only.
        </p>
      </div>

      {/* Announcement */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input placeholder="Type announcement..." value={message} onChange={e => setMessage(e.target.value)} className="flex-1"
              onKeyDown={e => e.key === "Enter" && sendAnnouncement()} />
            <Select className="w-32" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="NORMAL">Normal</option><option value="IMPORTANT">Important</option><option value="URGENT">Urgent</option>
            </Select>
            <Button onClick={sendAnnouncement}><Send className="h-4 w-4" /> Send</Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Attempts */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Active Attempts ({activeAttempts.length})</CardTitle></CardHeader>
        <CardContent>
          {activeAttempts.length === 0 ? <p className="text-gray-500 text-center py-4">No active attempts.</p> : (
            <div className="space-y-3">
              {activeAttempts.map((a: any) => {
                const pct = a.total_questions > 0 ? (a.answered_count / a.total_questions) * 100 : 0;
                const deadline = new Date(a.server_deadline);
                const remaining = Math.max(0, Math.floor((deadline.getTime() - new Date(data.serverTime).getTime()) / 1000));
                const mins = Math.floor(remaining / 60);
                return (
                  <div key={a.id} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{a.candidate_name}</span>
                        <span className="text-gray-500 ml-2 text-sm">{a.candidate_email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.incident_count > 0 && (
                          <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />{a.incident_count} incidents</Badge>
                        )}
                        <span className="text-sm text-gray-500">{mins}m remaining</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={pct} className="flex-1" />
                      <span className="text-sm text-gray-600 w-20 text-right">{a.answered_count}/{a.total_questions}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incidents */}
      <Card>
        <CardHeader><CardTitle>Recent Incidents</CardTitle></CardHeader>
        <CardContent>
          {(data.incidents?.length || 0) === 0 ? <p className="text-gray-500 text-center py-4">No incidents recorded.</p> : (
            <div className="space-y-2">
              {data.incidents?.slice(0, 20).map((inc: any) => (
                <div key={inc.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                  <Badge variant={inc.severity === "HIGH" ? "destructive" : inc.severity === "MEDIUM" ? "warning" : "secondary"}>{inc.severity}</Badge>
                  <span className="font-medium">{inc.user_name}</span>
                  <span className="text-gray-500">{inc.type.replace(/_/g, " ")}</span>
                  {inc.description && <span className="text-gray-400">— {inc.description}</span>}
                  <span className="ml-auto text-gray-400 text-xs">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
