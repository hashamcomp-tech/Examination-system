"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export default function CandidateDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ examId: "", type: "GRADING_ERROR", subject: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/disputes").then(r => r.json()).then(d => setDisputes(d.disputes || []));
    fetch("/api/exams").then(r => r.json()).then(d => setExams(d.exams || []));
  }, []);

  const handleSubmit = async () => {
    const res = await fetch("/api/disputes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { toast("Dispute filed", "success"); setShowCreate(false); window.location.reload(); }
    else { const d = await res.json(); toast(d.error, "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Disputes</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>File Dispute</Button>
      </div>

      {showCreate && (
        <Card className="mb-6"><CardContent className="p-6 space-y-4">
          <Select value={form.examId} onChange={e => setForm(f => ({ ...f, examId: e.target.value }))}>
            <option value="">Select Exam</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </Select>
          <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            <option value="GRADING_ERROR">Grading Error</option>
            <option value="AMBIGUOUS_QUESTION">Ambiguous Question</option>
            <option value="TECHNICAL_ISSUE">Technical Issue</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          <Textarea placeholder="Describe your dispute..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Submit</Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {disputes.map(d => (
          <Card key={d.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{d.subject}</h3>
                <p className="text-sm text-gray-500">{d.exam_title} · {d.type.replace(/_/g, " ")}</p>
                {d.resolution && <p className="text-sm text-green-700 mt-1">Resolution: {d.resolution}</p>}
              </div>
              <Badge variant={d.status === "OPEN" ? "destructive" : d.status === "RESOLVED" ? "success" : d.status === "UNDER_REVIEW" ? "warning" : "secondary"}>{d.status}</Badge>
            </CardContent>
          </Card>
        ))}
        {disputes.length === 0 && <p className="text-center text-gray-500 py-8">No disputes filed.</p>}
      </div>
    </div>
  );
}
