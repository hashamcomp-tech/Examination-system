"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export default function ExaminerDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();

  useEffect(() => { fetch("/api/disputes").then(r => r.json()).then(d => setDisputes(d.disputes || [])); }, []);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/disputes/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolution }),
    });
    if (res.ok) { toast("Updated", "success"); window.location.reload(); }
    else toast("Failed", "error");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dispute Management</h1>
      <div className="space-y-3">
        {disputes.map(d => (
          <Card key={d.id} className={selected?.id === d.id ? "ring-2 ring-blue-500" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{d.subject}</h3>
                    <Badge variant={d.status === "OPEN" ? "destructive" : d.status === "RESOLVED" ? "success" : "warning"}>{d.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{d.candidate_name} · {d.exam_title} · {d.type.replace(/_/g, " ")}</p>
                  <p className="text-sm text-gray-700 mt-2">{d.description}</p>
                </div>
                {d.status !== "RESOLVED" && d.status !== "REJECTED" && (
                  <Button size="sm" variant="outline" onClick={() => setSelected(d)}>Review</Button>
                )}
              </div>
              {selected?.id === d.id && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <Textarea placeholder="Resolution notes..." value={resolution} onChange={e => setResolution(e.target.value)} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(d.id, "UNDER_REVIEW")}>Under Review</Button>
                    <Button size="sm" variant="success" onClick={() => updateStatus(d.id, "RESOLVED")}>Resolve</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(d.id, "REJECTED")}>Reject</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {disputes.length === 0 && <p className="text-center text-gray-500 py-8">No disputes to review.</p>}
      </div>
    </div>
  );
}
